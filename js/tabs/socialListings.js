let socialUiState = { platform: "all", tier: "all" };

const PLATFORMS = ["X", "LinkedIn", "YouTube", "Reddit", "Instagram"];
const TIERS = ["Owned Channel", "Verified", "High Reach", "Industry Leader", "General"];

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
  const d = new Date(p.effectiveDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return p.dateConfidence === "exact" ? d : `Found ${d}`;
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
          ? `<span><b>${p.likes}</b> likes</span><span><b>${p.comments}</b> comments</span><span><b>${p.shares}</b> shares</span><span><b>${p.engagementRate}%</b> engagement</span>`
          : `<span title="No social API is connected, so engagement counts aren't available for this post.">Engagement data unavailable</span>`}
        <span style="margin-left:auto;">${socialDateLabel(p)}</span>
      </div>
    </div>
  `;
}

function renderSocialListingsTab(state) {
  const panel = document.getElementById("panel-social-listings");
  const filtered = filterSocialPosts(state.socialPosts);

  panel.innerHTML = `
    <div class="panel" style="margin-bottom:16px; background:var(--surface-alt);">
      <strong>How this data was gathered.</strong> No X, LinkedIn, YouTube, Reddit or Instagram API is
      authenticated for Mintoak yet, so these cards are real posts found via public web search rather than a
      connected social listening feed. Two honest gaps that come with that: engagement counts (likes/comments/
      shares) aren't visible in search results, so they're marked unavailable rather than guessed; and most
      results are Mintoak's own official posts, since public search indexes very little third-party chatter
      about a B2B merchant-payments platform (no Reddit mentions were found at all). See README →
      "Connecting Live Data" to wire up a real API for full engagement metrics and broader third-party reach.
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
