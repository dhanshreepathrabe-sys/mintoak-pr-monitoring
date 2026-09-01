function computeNetSentimentScore(counts) {
  const total = counts.Positive + counts.Neutral + counts.Negative;
  if (total === 0) return 0;
  return Math.round(((counts.Positive - counts.Negative) / total) * 100);
}

function buildDailySeries(mentions, start, end) {
  const buckets = computeTimeBuckets(mentions, start, end, (m) => m.publishedDate);
  return buckets.map((b) => ({ date: b.label, count: b.items.length }));
}

function buildPlatformVolume(mentions, socialPosts) {
  const map = new Map();
  mentions.forEach((m) => map.set(m.sourceType, (map.get(m.sourceType) || 0) + 1));
  const bySocialPlatform = new Map();
  socialPosts.forEach((p) => bySocialPlatform.set(p.platform, (bySocialPlatform.get(p.platform) || 0) + 1));
  bySocialPlatform.forEach((count, platform) => map.set(platform, (map.get(platform) || 0) + count));
  return Array.from(map.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

/** Rule-based auto-summary: groups in-range mentions by topic and writes one bullet per topic cluster. */
function buildSummaryBullets(mentions) {
  if (mentions.length === 0) {
    return ["No Mintoak mentions found in the selected timeframe."];
  }
  const byTopic = new Map();
  mentions.forEach((m) => {
    const key = m.topic || "General";
    if (!byTopic.has(key)) byTopic.set(key, []);
    byTopic.get(key).push(m);
  });

  const bullets = [];
  Array.from(byTopic.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([topic, items]) => {
      const sentimentCounts = aggregateSentiment(items, (i) => `${i.headline} ${i.snippet}`);
      const dominant = Object.entries(sentimentCounts).sort((a, b) => b[1] - a[1])[0][0];
      const outlets = [...new Set(items.map((i) => i.source))].slice(0, 3).join(", ");
      const plural = items.length > 1 ? "mentions" : "mention";
      bullets.push(
        `${topic}: ${items.length} ${plural} (predominantly ${dominant.toLowerCase()}), covered by ${outlets}${items.length > 3 ? " and others" : ""}.`
      );
    });
  return bullets;
}

function formatReach(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function renderOverviewTab(state) {
  const { mentions, socialPosts, range } = state;
  const totalReach = mentions.reduce((sum, m) => sum + m.reach, 0);
  const sentimentCounts = aggregateSentiment(mentions, (m) => `${m.headline} ${m.snippet}`);
  const netSentiment = computeNetSentimentScore(sentimentCounts);
  const sov = computeShareOfVoice(mentions.length);

  document.getElementById("metric-grid").innerHTML = `
    ${metricCardHtml("Total Mentions", mentions.length, `${socialPosts.length} social posts (web search)`)}
    ${metricCardHtml("Share of Voice", `${sov}%`, "vs. tracked competitors, illustrative")}
    ${metricCardHtml("Net Sentiment Score", netSentiment > 0 ? `+${netSentiment}` : netSentiment, `${sentimentCounts.Positive} pos / ${sentimentCounts.Neutral} neu / ${sentimentCounts.Negative} neg`)}
    ${metricCardHtml("Reach / Impressions", formatReach(totalReach), "estimated, see methodology in README")}
  `;

  const series = buildDailySeries(mentions, range.start, range.end);
  renderMentionsOverTime("chart-mentions-over-time", series);

  const platformVolume = buildPlatformVolume(mentions, socialPosts);
  renderPlatformVolume("chart-platform-volume", platformVolume);

  const keywords = extractTopKeywords(mentions);
  document.getElementById("keyword-tagbar").innerHTML = keywords.length
    ? keywords.map((k) => `<span class="tag-chip">${escapeHtml(k.word)} · ${k.count}</span>`).join("")
    : `<div class="empty-state">No keyword signal in this range.</div>`;

  const bullets = buildSummaryBullets(mentions);
  document.getElementById("summary-feed").innerHTML = bullets
    .map((b) => `<li><span class="bullet"></span><span>${escapeHtml(b)}</span></li>`)
    .join("");
}

function metricCardHtml(label, value, delta) {
  return `
    <div class="metric-card">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      <div class="delta">${delta}</div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
