/**
 * Runtime data layer. Reads the baked-in globals from data.generated.js
 * (produced by scripts/build-data.mjs from data/*.json) and derives the
 * computed fields the UI needs (reach score, sentiment, aspects, keywords).
 *
 * To go live: replace loadRawMentions()/loadRawSocial() with real API calls
 * (see README > Connecting Live Data) — everything downstream (filtering,
 * charts, dedupe, sentiment) already works against this same shape.
 */

const SOURCE_TYPE_WEIGHT = { News: 1, "Press Release": 0.85, Blog: 0.6, Forum: 0.4 };

function hashToUnit(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

/** Deterministic, explainable reach estimate: domain authority x source-type weight x a stable per-item factor. */
function estimateReach(item) {
  const authority = getDomainAuthority(item.url);
  const base = authority.trusted ? 45000 : 6000;
  const typeWeight = SOURCE_TYPE_WEIGHT[item.sourceType] || 0.5;
  const jitter = 0.6 + hashToUnit(item.id) * 0.9; // 0.6x - 1.5x
  return Math.round(base * typeWeight * jitter);
}

function enrichMention(raw) {
  const sentiment = scoreSentiment(`${raw.headline} ${raw.snippet}`);
  const authority = getDomainAuthority(raw.url);
  const cleanUrl = scrubUrl(raw.url);
  return {
    ...raw,
    url: cleanUrl,
    sentiment: sentiment.label,
    sentimentConfidence: sentiment.confidence,
    reach: estimateReach(raw),
    domainAuthority: authority,
    https: isHttps(cleanUrl),
    aspects: classifyAspects(`${raw.headline} ${raw.snippet}`),
    linkStatus: raw.linkStatus || null // populated by scripts/verify-links.mjs when run
  };
}

function loadRawMentions() {
  return (typeof MENTIONS_SEED !== "undefined" ? MENTIONS_SEED : []);
}

function loadRawSocial() {
  return (typeof SOCIAL_SEED !== "undefined" ? SOCIAL_SEED.posts : []);
}

function getSocialDiscoveryDate() {
  return (typeof SOCIAL_SEED !== "undefined" && SOCIAL_SEED.discoveryDate) || new Date().toISOString().slice(0, 10);
}

function getAllMentions() {
  const raw = loadRawMentions();
  const relevant = filterRelevantMentions(raw);
  const deduped = deduplicateMentions(relevant);
  return deduped.map(enrichMention).sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));
}

/**
 * Social posts are real (found via web search), but many don't carry a
 * verifiable exact publish date. `effectiveDate` is what drives the
 * date-range filter and timeline placement: the real publishedDate when
 * known, otherwise the date this crawl discovered the post — never a
 * guessed publish date. `dateConfidence` tells the UI which one it's
 * showing so the card can say "Discovered ..." instead of "Published ...".
 */
function getAllSocialPosts() {
  const discoveryDate = getSocialDiscoveryDate();
  return loadRawSocial()
    .map((p) => {
      const sentiment = scoreSentiment(p.postText);
      return {
        ...p,
        url: scrubUrl(p.url),
        sentiment: sentiment.label,
        sentimentConfidence: sentiment.confidence,
        effectiveDate: p.publishedDate || discoveryDate
      };
    })
    .sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
}

/**
 * Illustrative competitor baseline for Share of Voice, since no competitor
 * media-monitoring feed is wired in yet. Replace with real named-competitor
 * mention counts (same pipeline, different query) once available — see
 * README > Connecting Live Data.
 */
const SOV_COMPETITOR_BASELINE = 1.35; // competitor mention volume as a multiple of Mintoak's, illustrative

function computeShareOfVoice(mentionCount) {
  if (mentionCount === 0) return 0;
  const competitorVolume = mentionCount * SOV_COMPETITOR_BASELINE;
  return Math.round((mentionCount / (mentionCount + competitorVolume)) * 1000) / 10; // one decimal
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "will", "have", "has",
  "are", "was", "were", "its", "their", "to", "of", "in", "on", "a", "an",
  "as", "at", "by", "is", "it", "be", "or", "into", "across", "beyond",
  "mintoak", "mintoak's"
]);

function extractTopKeywords(mentions, limit = 14) {
  const freq = new Map();
  mentions.forEach((m) => {
    const words = `${m.headline} ${m.topic}`
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w));
    words.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));
  });
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}
