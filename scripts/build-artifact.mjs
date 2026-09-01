#!/usr/bin/env node
/**
 * Bundles the whole dashboard (index.html markup + css/styles.css + every
 * js/*.js file, in load order + the vendored Chart.js/jsPDF) into ONE
 * self-contained HTML file, for publishing as a Claude Artifact (which
 * takes a single file and can't resolve relative <script src>/<link href>
 * paths).
 *
 * Also reworks the light/dark theme CSS block to follow the Artifact
 * convention: the bare :root defines light tokens, a
 * `@media (prefers-color-scheme: dark)` block (guarded by
 * `:root:not([data-theme="light"])`) covers the system-dark case, and
 * `:root[data-theme="dark"]` covers the in-app toggle explicitly — so the
 * page reads correctly in all three viewer states (light / dark / system)
 * even before the app's own JS runs.
 *
 * Usage:
 *   node scripts/build-artifact.mjs [output-path]
 *   # output-path defaults to <repo>/dist/mintoak-pr-dashboard.artifact.html
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const read = (p) => readFile(path.join(root, p), "utf-8");

const outPath = process.argv[2] || path.join(root, "dist", "mintoak-pr-dashboard.artifact.html");

const JS_FILES = [
  "js/data.generated.js",
  "js/filters.js",
  "js/sentiment.js",
  "js/dedupe.js",
  "js/linkVerify.js",
  "js/data.js",
  "js/charts.js",
  "js/export.js",
  "js/tabs/overview.js",
  "js/tabs/liveMentions.js",
  "js/tabs/socialListings.js",
  "js/tabs/sentimentTab.js",
  "js/app.js"
];

async function main() {
  const css = await read("css/styles.css");
  const chart = await read("vendor/chart.umd.min.js");
  const jspdf = await read("vendor/jspdf.umd.min.js");

  let appJs = "";
  for (const f of JS_FILES) {
    appJs += `\n/* ---- ${f} ---- */\n` + (await read(f));
  }

  const darkBlockMatch = css.match(/\[data-theme="dark"\] \{[\s\S]*?\n\}\n/);
  if (!darkBlockMatch) throw new Error("Could not find the [data-theme=\"dark\"] CSS block to rework.");
  const darkVars = darkBlockMatch[0].replace('[data-theme="dark"] {', "").trim().replace(/\}$/, "").trim();

  const newThemeCss = `@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    ${darkVars}
  }
}

:root[data-theme="dark"] {
  ${darkVars}
}
`;
  const reworkedCss = css.replace(darkBlockMatch[0], newThemeCss);

  const indexHtml = await read("index.html");
  const startMarker = '<div class="app-shell">';
  const endMarker = '</div>\n\n  <script';
  const startIdx = indexHtml.indexOf(startMarker);
  const endIdx = indexHtml.indexOf(endMarker, startIdx);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Could not locate app-shell markup in index.html (start=${startIdx} end=${endIdx}) — did its structure change? Update the markers in this script.`);
  }
  const bodyContent = indexHtml.slice(startIdx, endIdx + "</div>".length).trim();

  const out = `<title>Mintoak PR Monitor</title>
<meta name="description" content="PR monitoring dashboard for Mintoak — live media mentions, social listening, and sentiment analysis." />
<style>
${reworkedCss}
</style>

${bodyContent}

<script>
${chart}
</script>
<script>
${jspdf}
</script>
<script>
${appJs}
</script>
`;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, out, "utf-8");
  console.log(`Wrote ${outPath} (${Buffer.byteLength(out, "utf-8")} bytes).`);
  console.log("Publish it with the Artifact tool (pass the existing artifact's `url` to update in place).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
