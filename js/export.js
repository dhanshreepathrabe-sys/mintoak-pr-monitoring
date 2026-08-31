/** CSV + PDF export for the currently filtered mention set. */
function toCsvValue(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportMentionsCsv(mentions) {
  const headers = ["Source", "Source Type", "Author", "Headline", "Published Date", "Sentiment", "Sentiment Confidence %", "Reach", "Domain", "URL"];
  const rows = mentions.map((m) => [
    m.source, m.sourceType, m.author, m.headline, m.publishedDate, m.sentiment, m.sentimentConfidence, m.reach, m.domainAuthority.host, m.url
  ]);
  const csv = [headers, ...rows].map((r) => r.map(toCsvValue).join(",")).join("\n");
  downloadBlob(csv, `mintoak-mentions-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8;");
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportSummaryPdf(state, summary) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  let y = margin;

  doc.setFontSize(16);
  doc.setTextColor(34, 42, 30);
  doc.text("Mintoak — PR Monitoring Report", margin, y);
  y += 18;
  doc.setFontSize(10);
  doc.setTextColor(90, 100, 80);
  doc.text(`Range: ${state.rangeLabel}   |   Generated: ${new Date().toLocaleString()}`, margin, y);
  y += 26;

  doc.setFontSize(12);
  doc.setTextColor(34, 42, 30);
  doc.text("Key metrics", margin, y);
  y += 16;
  doc.setFontSize(10);
  summary.metrics.forEach((m) => {
    doc.text(`${m.label}: ${m.value}`, margin, y);
    y += 14;
  });
  y += 10;

  doc.setFontSize(12);
  doc.text("Summary", margin, y);
  y += 16;
  doc.setFontSize(10);
  summary.bullets.forEach((b) => {
    const lines = doc.splitTextToSize(`• ${b}`, 515);
    lines.forEach((line) => {
      if (y > 780) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 14;
    });
  });

  y += 10;
  doc.setFontSize(12);
  doc.text(`Mentions in range (${summary.mentions.length})`, margin, y);
  y += 14;
  doc.setFontSize(8.5);
  summary.mentions.slice(0, 40).forEach((m) => {
    if (y > 780) { doc.addPage(); y = margin; }
    const lines = doc.splitTextToSize(`${m.publishedDate}  [${m.sentiment}]  ${m.source} — ${m.headline}`, 515);
    lines.forEach((line) => { doc.text(line, margin, y); y += 12; });
  });

  doc.save(`mintoak-pr-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
