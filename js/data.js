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

function getAllMentions() {
  const raw = loadRawMentions();
  const relevant = filterRelevantMentions(raw);
  const deduped = deduplicateMentions(relevant);
  return deduped.map(enrichMention).sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));
}

/**
 * Social posts are real, third-party-only (Mintoak's own channels are
 * excluded — see data/social.seed.json). Every post carries its actual
 * publish date: `dateConfidence: "exact"` when a search result stated it
 * directly, `"estimated"` when it's a well-reasoned estimate anchored to
 * the news event the post is visibly reacting to (the platform's own
 * timestamp wasn't visible in search results). Never a crawl/discovery
 * date — `publishedDate` is what drives both the date-range filter and
 * the card display.
 */
function getAllSocialPosts() {
  return loadRawSocial()
    .map((p) => {
      const sentiment = scoreSentiment(p.postText);
      return {
        ...p,
        url: scrubUrl(p.url),
        sentiment: sentiment.label,
        sentimentConfidence: sentiment.confidence
      };
    })
    .sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));
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

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BUCKETS = 120;

/**
 * Buckets a date range for timeline charts. Never iterates day-by-day over
 * a wide span (the "All Time" default range is a fixed 2000-2100 window,
 * so a naive daily loop would run ~36,500 times) — instead it clamps to
 * the actual min/max date found in `items` (when any exist) and picks a
 * bucket size (day/week/month) so the bucket count stays bounded and the
 * chart stays readable, however wide the nominal range is.
 */
function computeTimeBuckets(items, start, end, getDateFn) {
  let effectiveStart = start;
  let effectiveEnd = end;

  if (items.length) {
    const times = items.map((i) => new Date(getDateFn(i)).getTime()).filter((t) => !Number.isNaN(t));
    if (times.length) {
      const minDate = new Date(Math.min(...times));
      const maxDate = new Date(Math.max(...times));
      effectiveStart = minDate < start ? start : minDate;
      effectiveEnd = maxDate > end ? end : maxDate;
      if (effectiveStart > effectiveEnd) effectiveStart = effectiveEnd;
    }
  } else {
    // No data at all: still bound the span so an accidental huge nominal
    // range (e.g. "All Time" with an empty dataset) can't blow up the loop.
    const spanDays = (end - start) / DAY_MS;
    if (spanDays > 366) {
      effectiveStart = new Date(end);
      effectiveStart.setDate(effectiveStart.getDate() - 29);
    }
  }

  const spanDays = Math.max(1, (effectiveEnd - effectiveStart) / DAY_MS);
  const granularity = spanDays <= 62 ? "day" : spanDays <= 730 ? "week" : "month";

  const keyOf = (d) => {
    if (granularity === "month") return d.toISOString().slice(0, 7);
    if (granularity === "week") {
      const monday = new Date(d);
      const dow = (monday.getDay() + 6) % 7; // 0 = Monday
      monday.setDate(monday.getDate() - dow);
      return monday.toISOString().slice(0, 10);
    }
    return d.toISOString().slice(0, 10);
  };
  const labelOf = (d) =>
    granularity === "month"
      ? d.toLocaleDateString(undefined, { year: "2-digit", month: "short" })
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const advance = (d) => {
    const next = new Date(d);
    if (granularity === "month") next.setMonth(next.getMonth() + 1);
    else if (granularity === "week") next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    return next;
  };

  const buckets = [];
  let cursor = new Date(effectiveStart);
  let guard = 0;
  while (cursor <= effectiveEnd && guard < MAX_BUCKETS) {
    buckets.push({ key: keyOf(cursor), label: labelOf(cursor), date: new Date(cursor), items: [] });
    cursor = advance(cursor);
    guard += 1;
  }
  if (buckets.length === 0) {
    buckets.push({ key: keyOf(effectiveStart), label: labelOf(effectiveStart), date: new Date(effectiveStart), items: [] });
  }

  const byKey = new Map(buckets.map((b) => [b.key, b]));
  items.forEach((item) => {
    const d = new Date(getDateFn(item));
    if (Number.isNaN(d.getTime())) return;
    const k = keyOf(d);
    const bucket = byKey.get(k);
    if (bucket) bucket.items.push(item);
  });

  return buckets;
}
