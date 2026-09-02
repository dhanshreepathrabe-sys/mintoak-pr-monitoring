let liveMentionsUiState = { search: "", sourceType: "all", sort: "newest", region: "all" };

function sentimentBadge(label, confidence) {
  const cls = label.toLowerCase();
  return `<span class="badge ${cls}">${label}${confidence ? ` <span class="confidence">${confidence}%</span>` : ""}</span>`;
}

function domainBadge(authority) {
  return authority.trusted
    ? `<span class="badge verified">Verified domain</span>`
    : `<span class="badge unverified">Unrecognized domain</span>`;
}

function renderLiveMentionsControls(mentions) {
  const sourceTypes = ["all", "News", "Blogs", "Forum", "Press Release"];
  const regions = ["all", ...getGeographyDistribution(mentions).byRegion.map((r) => r.label)];
  return `
    <div class="controls-row">
      <input id="lm-search" class="search-input" type="search" placeholder="Search mentions by headline, snippet, or source…" value="${liveMentionsUiState.search}" />
      <select id="lm-sourcetype" class="filter-select">
        ${sourceTypes.map((t) => `<option value="${t}" ${liveMentionsUiState.sourceType === t ? "selected" : ""}>${t === "all" ? "All source types" : t}</option>`).join("")}
      </select>
      <select id="lm-region" class="filter-select">
        ${regions.map((r) => `<option value="${r}" ${liveMentionsUiState.region === r ? "selected" : ""}>${r === "all" ? "All regions" : r}</option>`).join("")}
      </select>
      <select id="lm-sort" class="filter-select">
        <option value="newest" ${liveMentionsUiState.sort === "newest" ? "selected" : ""}>Newest first</option>
        <option value="reach" ${liveMentionsUiState.sort === "reach" ? "selected" : ""}>Impact / Reach</option>
        <option value="prvalue" ${liveMentionsUiState.sort === "prvalue" ? "selected" : ""}>PR Value</option>
      </select>
      <button id="lm-export-csv" class="pill-btn">Export CSV</button>
    </div>
  `;
}

function filterAndSortMentions(mentions) {
  let out = mentions;
  const q = liveMentionsUiState.search.trim().toLowerCase();
  if (q) {
    out = out.filter((m) =>
      `${m.headline} ${m.snippet} ${m.source}`.toLowerCase().includes(q)
    );
  }
  if (liveMentionsUiState.sourceType !== "all") {
    const wanted = liveMentionsUiState.sourceType === "Blogs" ? "Blog" : liveMentionsUiState.sourceType;
    out = out.filter((m) => m.sourceType === wanted);
  }
  if (liveMentionsUiState.region !== "all") {
    out = out.filter((m) => getRegionForCountry(m.country) === liveMentionsUiState.region);
  }
  out = [...out].sort((a, b) => {
    if (liveMentionsUiState.sort === "reach") return b.reach - a.reach;
    if (liveMentionsUiState.sort === "prvalue") return b.prValue - a.prValue;
    return new Date(b.publishedDate) - new Date(a.publishedDate);
  });
  return out;
}

function mentionCardHtml(m) {
  const linkStatusBadge = m.linkStatus
    ? (m.linkStatus.ok
        ? `<span class="badge positive">HTTP ${m.linkStatus.httpStatus} OK</span>`
        : `<span class="badge negative">Link check failed</span>`)
    : `<span class="badge gray" title="Run scripts/verify-links.mjs to get an authoritative HTTP status">Link status: not yet checked</span>`;

  return `
    <div class="mention-card">
      <div class="mention-top">
        <div class="mention-source">${escapeHtml(m.source)} <span class="badge gray">${m.sourceType}</span> <span class="badge gray" title="Region: ${escapeHtml(getRegionForCountry(m.country))}">${escapeHtml(m.country || "Unknown")}</span></div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${sentimentBadge(m.sentiment, m.sentimentConfidence)}
        </div>
      </div>
      <div class="mention-headline">
        <a href="${m.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(m.headline)}</a>
      </div>
      <div class="mention-snippet">${escapeHtml(m.snippet)}</div>
      <div class="mention-meta">
        <span>By ${escapeHtml(m.author)}</span>
        <span>·</span>
        <span>${new Date(m.publishedDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
        <span>·</span>
        <span>Reach ≈ ${formatReach(m.reach)}</span>
        <span>·</span>
        <span title="Illustrative EMV estimate — see README > PR Value methodology">PR Value ≈ ${formatINR(m.prValue)}</span>
        <span>·</span>
        ${domainBadge(m.domainAuthority)}
        ${m.https ? `<span class="badge positive">HTTPS</span>` : `<span class="badge negative">Not HTTPS</span>`}
        ${linkStatusBadge}
      </div>
      ${m.syndicatedCount > 0 ? `<div class="dup-note">Also syndicated to ${m.syndicatedCount} other outlet${m.syndicatedCount > 1 ? "s" : ""} (${escapeHtml(m.syndicatedSources.join(", "))}) — deduplicated from this feed.</div>` : ""}
    </div>
  `;
}

function renderLiveMentionsTab(state) {
  const panel = document.getElementById("panel-live-mentions");
  const filtered = filterAndSortMentions(state.mentions);
  const totalLabel = filtered.length === state.mentions.length
    ? `${state.mentions.length} total mention${state.mentions.length === 1 ? "" : "s"} in range`
    : `Showing ${filtered.length} of ${state.mentions.length} total mentions in range`;

  panel.innerHTML = `
    ${renderLiveMentionsControls(state.mentions)}
    <div style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">${totalLabel}</div>
    <div class="mention-list">
      ${filtered.length ? filtered.map(mentionCardHtml).join("") : `<div class="empty-state">No mentions match your filters in this timeframe.</div>`}
    </div>
  `;

  document.getElementById("lm-search").addEventListener("input", (e) => {
    liveMentionsUiState.search = e.target.value;
    renderLiveMentionsTab(state);
  });
  document.getElementById("lm-sourcetype").addEventListener("change", (e) => {
    liveMentionsUiState.sourceType = e.target.value;
    renderLiveMentionsTab(state);
  });
  document.getElementById("lm-region").addEventListener("change", (e) => {
    liveMentionsUiState.region = e.target.value;
    renderLiveMentionsTab(state);
  });
  document.getElementById("lm-sort").addEventListener("change", (e) => {
    liveMentionsUiState.sort = e.target.value;
    renderLiveMentionsTab(state);
  });
  document.getElementById("lm-export-csv").addEventListener("click", () => exportMentionsCsv(filtered));
}
