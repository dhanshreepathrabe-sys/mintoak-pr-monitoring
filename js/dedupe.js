/** Deduplicate syndicated press releases / cross-posted content by headline similarity. */
function tokenize(text) {
  return new Set(
    (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function jaccardSimilarity(a, b) {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach((w) => { if (setB.has(w)) intersection += 1; });
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

const SYNDICATION_THRESHOLD = 0.55;

/**
 * Groups near-identical headlines (same press release syndicated across
 * outlets). Returns a list of clusters: { primary, duplicates[] }, primary
 * being the earliest-published item.
 */
function clusterSyndicatedMentions(items) {
  const sorted = [...items].sort((a, b) => new Date(a.publishedDate) - new Date(b.publishedDate));
  const clusters = [];
  const used = new Set();

  sorted.forEach((item) => {
    if (used.has(item.id)) return;
    const cluster = { primary: item, duplicates: [] };
    used.add(item.id);

    sorted.forEach((candidate) => {
      if (used.has(candidate.id)) return;
      if (jaccardSimilarity(item.headline, candidate.headline) >= SYNDICATION_THRESHOLD) {
        cluster.duplicates.push(candidate);
        used.add(candidate.id);
      }
    });

    clusters.push(cluster);
  });

  return clusters;
}

/** Flattened, deduplicated view: one row per cluster, with a syndication count. */
function deduplicateMentions(items) {
  return clusterSyndicatedMentions(items).map((c) => ({
    ...c.primary,
    syndicatedCount: c.duplicates.length,
    syndicatedSources: c.duplicates.map((d) => d.source)
  }));
}
