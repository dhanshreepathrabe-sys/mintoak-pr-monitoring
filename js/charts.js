/** Thin Chart.js wrappers, themed to the Mintoak palette. Each render fn destroys any prior instance on that canvas. */
const CHART_REGISTRY = {};

function themeColors() {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  return {
    text: dark ? "#a9b39d" : "#5c6656",
    grid: dark ? "#34402c" : "#e0e6d8",
    mint: "#80c341",
    mintDeep: "#48821c",
    mintBright: "#87bd28",
    positive: "#2e8b3d",
    neutral: "#8a8f57",
    negative: "#c4432b"
  };
}

function destroyIfExists(canvasId) {
  if (CHART_REGISTRY[canvasId]) {
    CHART_REGISTRY[canvasId].destroy();
    delete CHART_REGISTRY[canvasId];
  }
}

function renderMentionsOverTime(canvasId, series) {
  destroyIfExists(canvasId);
  const c = themeColors();
  const ctx = document.getElementById(canvasId).getContext("2d");
  CHART_REGISTRY[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: series.map((s) => s.date),
      datasets: [{
        label: "Mentions",
        data: series.map((s) => s.count),
        borderColor: c.mintDeep,
        backgroundColor: "rgba(128,195,65,0.15)",
        fill: true,
        tension: 0.35,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: c.text, maxRotation: 0 }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: c.text, precision: 0 }, grid: { color: c.grid } }
      }
    }
  });
}

function renderGeographyVolume(canvasId, data) {
  destroyIfExists(canvasId);
  const c = themeColors();
  const ctx = document.getElementById(canvasId).getContext("2d");
  CHART_REGISTRY[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map((d) => d.label),
      datasets: [{
        data: data.map((d) => d.count),
        backgroundColor: c.mintDeep,
        borderRadius: 6,
        maxBarThickness: 22
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { color: c.text, precision: 0 }, grid: { color: c.grid } },
        y: { ticks: { color: c.text }, grid: { display: false } }
      }
    }
  });
}

function renderPlatformVolume(canvasId, data) {
  destroyIfExists(canvasId);
  const c = themeColors();
  const ctx = document.getElementById(canvasId).getContext("2d");
  CHART_REGISTRY[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map((d) => d.label),
      datasets: [{
        data: data.map((d) => d.count),
        backgroundColor: c.mint,
        borderRadius: 6,
        maxBarThickness: 34
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: c.text }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: c.text, precision: 0 }, grid: { color: c.grid } }
      }
    }
  });
}

function renderSentimentDonut(canvasId, counts) {
  destroyIfExists(canvasId);
  const c = themeColors();
  const ctx = document.getElementById(canvasId).getContext("2d");
  CHART_REGISTRY[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Positive", "Neutral", "Negative"],
      datasets: [{
        data: [counts.Positive, counts.Neutral, counts.Negative],
        backgroundColor: [c.positive, c.neutral, c.negative],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: { legend: { position: "bottom", labels: { color: c.text, boxWidth: 10, font: { size: 11 } } } }
    }
  });
}

function renderSentimentTrend(canvasId, series) {
  destroyIfExists(canvasId);
  const c = themeColors();
  const ctx = document.getElementById(canvasId).getContext("2d");
  CHART_REGISTRY[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: series.map((s) => s.date),
      datasets: [
        { label: "Positive", data: series.map((s) => s.Positive), borderColor: c.positive, backgroundColor: "transparent", tension: 0.3, pointRadius: 1 },
        { label: "Neutral", data: series.map((s) => s.Neutral), borderColor: c.neutral, backgroundColor: "transparent", tension: 0.3, pointRadius: 1 },
        { label: "Negative", data: series.map((s) => s.Negative), borderColor: c.negative, backgroundColor: "transparent", tension: 0.3, pointRadius: 1 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: c.text, boxWidth: 10, font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: c.text, maxRotation: 0 }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: c.text, precision: 0 }, grid: { color: c.grid } }
      }
    }
  });
}
