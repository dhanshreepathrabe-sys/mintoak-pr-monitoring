let socialUiState = { platform: "all", tier: "all" };

const PLATFORMS = ["X", "LinkedIn", "YouTube", "Reddit", "Instagram", "Facebook"];
const TIERS = ["Verified", "High Reach", "Industry Leader", "General"];

function renderSocialControls() {
  return `
    <div class="controls-row">
      <select id="soc-platform" class="filter-select">
        <option value="all" ${socialUiState.platform === "all" ? "selected" : ""}>All platforms</option>
        ${PLATFORMS.map((p) => `<option value="${p}" ${socialUiState.platform === p ? "selected" : ""}>${p}</option>`).join("")}
      </select>
      <select id="soc-tier" class="filter-select">
        <option value="all" ${socialUiState.tier === "all" ? "selected" : ""}>All author tiers</option>
        ${TIERS.map((t) => `<option value="${t}" ${socialUiState.tier === t ? "selected" : ""}>${t}</option>`).join("")}
      </select>
    </div>
  `;
}

function filterSocialPosts(posts) {
  return posts.filter((p) => {
    if (socialUiState.platform !== "all" && p.platform !== socialUiState.platform) return false;
    if (socialUiState.tier !== "all" && p.authorTier !== socialUiState.tier) return false;
    return true;
  });
}

function socialDateLabel(p) {
  const d = new Date(p.publishedDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  return p.dateConfidence === "exact" ? d : `~${d}`;
}

function socialDateTitle(p) {
  return p.dateConfidence === "exact"
    ? "Publish date confirmed by the source"
    : "Estimated: the platform's own timestamp wasn't visible in search results, so this is anchored to the news event the post is visibly reacting to";
}

function socialCardHtml(p) {
  const initials = p.authorName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return `
    <div class="social-card">
      <div class="social-head">
        <div class="social-author">
          <div class="avatar">${initials}</div>
          <div>
            <div style="font-weight:700; font-size:12.5px;">${escapeHtml(p.authorName)} ${p.verified ? "✓" : ""}</div>
            <div style="font-size:11.5px; color:var(--text-muted);">${escapeHtml(p.authorHandle)} · ${p.platform}</div>
          </div>
        </div>
        ${sentimentBadge(p.sentiment, p.sentimentConfidence)}
      </div>
      <div style="font-size:13px; line-height:1.5;">${escapeHtml(p.postText)}</div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <span class="badge gray">${p.authorTier}</span>
        <span class="badge gray" title="Found via public web search, not a connected platform API">WEB SEARCH</span>
        <a href="${p.url}" target="_blank" rel="noopener noreferrer" style="font-size:11.5px;">View on ${p.platform} →</a>
      </div>
      <div class="social-metrics">
        ${p.metricsAvailable
          ? `<span><b>${p.likes}</b> likes</span><span><b>${p.comments}</b> comments</span><span><b>${p.shares}</b> shares</span>${typeof p.views === "number" ? `<span><b>${formatReach(p.views)}</b> views</span><span><b>${p.engagementRate}%</b> engagement</span>` : ""}`
          : `<span title="No social API result was available for this post, so engagement counts aren't recorded rather than guessed.">Engagement data unavailable</span>`}
        <span style="margin-left:auto;" title="${socialDateTitle(p)}">${socialDateLabel(p)}</span>
      </div>
    </div>
  `;
}

function renderSocialListingsTab(state) {
  const panel = document.getElementById("panel-social-listings");
  const filtered = filterSocialPosts(state.socialPosts);

  panel.innerHTML = `
    <div class="panel" style="margin-bottom:16px; background:var(--surface-alt);">
      <strong>How this data was gathered.</strong> Posts marked with real like/comment/share (and, where the
      platform exposes it, view) counts come from a connected social listening API queried on demand across
      X, LinkedIn, YouTube and Reddit — not a guess, not a scrape of search-result snippets. Posts without
      metrics predate that connector and were found via public web search instead, so their engagement is
      marked unavailable rather than invented. Either way, Mintoak's own website and its own official
      LinkedIn/X/Instagram/Facebook/YouTube posts are deliberately excluded — this feed is for outside
      listening, not a mirror of what the team already publishes. Dates are the post's actual publish date
      (marked "~" when it's a well-reasoned estimate anchored to the news event the post is visibly reacting
      to, or decoded from a LinkedIn/X Snowflake-style post ID — hover a date for why). This is an on-demand
      query, not continuous real-time monitoring, and it does not cover every platform (Instagram, Facebook
      and TikTok searches return discovery results, not full post content) — see README → "Connecting Live
      Data" for the current scope and how to extend it.
    </div>
    ${renderSocialControls()}
    <div class="social-grid">
      ${filtered.length ? filtered.map(socialCardHtml).join("") : `<div class="empty-state">No posts match your filters.</div>`}
    </div>
  `;

  document.getElementById("soc-platform").addEventListener("change", (e) => {
    socialUiState.platform = e.target.value;
    renderSocialListingsTab(state);
  });
  document.getElementById("soc-tier").addEventListener("change", (e) => {
    socialUiState.tier = e.target.value;
    renderSocialListingsTab(state);
  });
}
