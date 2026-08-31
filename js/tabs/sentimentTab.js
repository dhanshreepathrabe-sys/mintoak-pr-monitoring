const REACH_ALERT_THRESHOLD = 20000;

function buildSentimentTrendSeries(mentions, start, end) {
  const days = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days.map((d) => {
    const key = d.toISOString().slice(0, 10);
    const dayMentions = mentions.filter((m) => m.publishedDate === key);
    const counts = { Positive: 0, Neutral: 0, Negative: 0 };
    dayMentions.forEach((m) => { counts[m.sentiment] += 1; });
    return { date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), ...counts };
  });
}

function aspectRowHtml(bucket) {
  const total = bucket.Positive + bucket.Neutral + bucket.Negative;
  const pct = (n) => (total ? (n / total) * 100 : 0);
  return `
    <div class="aspect-row">
      <div style="font-size:12.5px; font-weight:600;">${bucket.label}</div>
      <div class="aspect-bar-track">
        <div class="aspect-bar-seg positive" style="width:${pct(bucket.Positive)}%"></div>
        <div class="aspect-bar-seg neutral" style="width:${pct(bucket.Neutral)}%"></div>
        <div class="aspect-bar-seg negative" style="width:${pct(bucket.Negative)}%"></div>
      </div>
      <div style="font-size:11.5px; color:var(--text-muted); text-align:right;">${total} mention${total !== 1 ? "s" : ""}</div>
    </div>
  `;
}

function riskAlertHtml(m) {
  return `
    <div class="alert-item">
      <div class="alert-top">
        <span>${escapeHtml(m.source)} · ${new Date(m.publishedDate).toLocaleDateString()}</span>
        <span>Reach ≈ ${formatReach(m.reach)}</span>
      </div>
      <p><a href="${m.url}" target="_blank" rel="noopener noreferrer" style="color:inherit;">${escapeHtml(m.headline)}</a></p>
    </div>
  `;
}

function renderSentimentTab(state) {
  const { mentions, range } = state;
  const panel = document.getElementById("panel-sentiment");

  const counts = aggregateSentiment(mentions, (m) => `${m.headline} ${m.snippet}`);
  const aspectBuckets = aggregateAspectSentiment(mentions, (m) => `${m.headline} ${m.snippet}`);
  const trendSeries = buildSentimentTrendSeries(mentions, range.start, range.end);
  const riskMentions = mentions.filter((m) => m.sentiment === "Negative" && m.reach >= REACH_ALERT_THRESHOLD);

  panel.innerHTML = `
    <div class="panel-grid">
      <div class="panel">
        <h3>Sentiment trend</h3>
        <div class="panel-sub">Daily positive / neutral / negative mention counts, correlated with PR events in Live Mentions.</div>
        <div class="chart-wrap"><canvas id="chart-sentiment-trend"></canvas></div>
      </div>
      <div class="panel">
        <h3>Sentiment distribution</h3>
        <div class="panel-sub">${mentions.length} mentions in range</div>
        <div class="chart-wrap"><canvas id="chart-sentiment-donut"></canvas></div>
      </div>
    </div>

    <div class="panel-grid">
      <div class="panel">
        <h3>Aspect-based sentiment</h3>
        <div class="panel-sub">Breakdown by what the mention is actually about, not just overall tone.</div>
        ${aspectBuckets.length ? aspectBuckets.map(aspectRowHtml).join("") : `<div class="empty-state">Not enough aspect signal in this range.</div>`}
      </div>
      <div class="panel">
        <h3>Risk &amp; alerts</h3>
        <div class="panel-sub">Negative mentions with reach ≥ ${formatReach(REACH_ALERT_THRESHOLD)} — prioritize for crisis response.</div>
        ${riskMentions.length ? riskMentions.map(riskAlertHtml).join("") : `<div class="empty-state">No high-reach negative mentions in this range.</div>`}
      </div>
    </div>
  `;

  renderSentimentTrend("chart-sentiment-trend", trendSeries);
  renderSentimentDonut("chart-sentiment-donut", counts);
}
