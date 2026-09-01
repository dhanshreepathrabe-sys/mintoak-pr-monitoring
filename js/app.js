const appState = {
  rangeKey: "lifetime",
  customStart: null,
  customEnd: null,
  activeTab: "overview",
  darkMode: false,
  lastRefreshed: new Date(),
  autoRefreshMinutes: 5
};

const RANGE_LABELS = {
  lifetime: "All Time",
  today: "Today",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  ytd: "Year-to-Date",
  custom: "Custom Range"
};

function getFilteredState() {
  const allMentions = getAllMentions();
  const allSocial = getAllSocialPosts();
  const { start, end } = getRangeBounds(appState.rangeKey, appState.customStart, appState.customEnd);

  const mentions = filterByDateRange(allMentions, appState.rangeKey, appState.customStart, appState.customEnd);
  const socialPosts = filterByDateRange(allSocial, appState.rangeKey, appState.customStart, appState.customEnd);

  return {
    mentions,
    socialPosts,
    range: { start, end },
    rangeLabel: RANGE_LABELS[appState.rangeKey]
  };
}

function renderActiveTab() {
  const state = getFilteredState();
  document.querySelectorAll(".tab-panel").forEach((el) => el.classList.remove("active"));
  document.getElementById(`panel-${appState.activeTab}`).classList.add("active");

  if (appState.activeTab === "overview") renderOverviewTab(state);
  if (appState.activeTab === "live-mentions") renderLiveMentionsTab(state);
  if (appState.activeTab === "social-listings") renderSocialListingsTab(state);
  if (appState.activeTab === "sentiment") renderSentimentTab(state);

  document.getElementById("scope-count").textContent =
    `${state.mentions.length} mentions · ${state.socialPosts.length} social posts in ${state.rangeLabel.toLowerCase()}`;
}

function setActiveTab(tab) {
  appState.activeTab = tab;
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
  renderActiveTab();
}

function setRange(rangeKey) {
  appState.rangeKey = rangeKey;
  document.querySelectorAll(".range-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.range === rangeKey));
  document.getElementById("custom-range-wrap").style.display = rangeKey === "custom" ? "inline-flex" : "none";
  renderActiveTab();
}

function updateRefreshIndicator() {
  const mins = Math.round((new Date() - appState.lastRefreshed) / 60000);
  document.getElementById("refresh-label").textContent =
    mins < 1 ? "Updated just now" : `Updated ${mins} min ago`;
}

function doRefresh() {
  appState.lastRefreshed = new Date();
  renderActiveTab();
  updateRefreshIndicator();
}

/** Sets theme state + DOM attribute only — does not render, so it's safe to call before the app has rendered anything. */
function initThemeState() {
  const saved = localStorage.getItem("mintoak-pr-theme");
  appState.darkMode = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-theme", appState.darkMode ? "dark" : "light");
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = appState.darkMode ? "☀ Light" : "● Dark";
}

function toggleTheme() {
  appState.darkMode = !appState.darkMode;
  localStorage.setItem("mintoak-pr-theme", appState.darkMode ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", appState.darkMode ? "dark" : "light");
  document.getElementById("theme-toggle").textContent = appState.darkMode ? "☀ Light" : "● Dark";
  renderActiveTab(); // charts need re-render to pick up new axis/legend colors
}

function initApp() {
  initThemeState();

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  document.querySelectorAll(".range-btn").forEach((btn) => {
    btn.addEventListener("click", () => setRange(btn.dataset.range));
  });

  document.getElementById("custom-start").addEventListener("change", (e) => {
    appState.customStart = e.target.value;
    if (appState.rangeKey === "custom") renderActiveTab();
  });
  document.getElementById("custom-end").addEventListener("change", (e) => {
    appState.customEnd = e.target.value;
    if (appState.rangeKey === "custom") renderActiveTab();
  });

  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
  document.getElementById("refresh-now").addEventListener("click", doRefresh);
  document.getElementById("export-pdf").addEventListener("click", () => {
    const state = getFilteredState();
    const counts = aggregateSentiment(state.mentions, (m) => `${m.headline} ${m.snippet}`);
    const net = computeNetSentimentScore(counts);
    const totalReach = state.mentions.reduce((s, m) => s + m.reach, 0);
    exportSummaryPdf(
      { rangeLabel: state.rangeLabel },
      {
        metrics: [
          { label: "Total Mentions", value: state.mentions.length },
          { label: "Share of Voice", value: `${computeShareOfVoice(state.mentions.length)}%` },
          { label: "Net Sentiment Score", value: net },
          { label: "Reach / Impressions", value: formatReach(totalReach) }
        ],
        bullets: buildSummaryBullets(state.mentions),
        mentions: state.mentions
      }
    );
  });

  renderActiveTab();
  updateRefreshIndicator();

  setInterval(doRefresh, appState.autoRefreshMinutes * 60 * 1000);
  setInterval(updateRefreshIndicator, 30 * 1000);
}

document.addEventListener("DOMContentLoaded", initApp);
