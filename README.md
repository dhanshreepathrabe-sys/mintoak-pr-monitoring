# Mintoak PR Monitoring Dashboard

A PR / media / social-listening dashboard for **Mintoak Innovations Pvt. Ltd.**
(the merchant-payments fintech), built as a dependency-light static web app
(HTML/CSS/vanilla JS + Chart.js + jsPDF, no build step, no framework).

Open `index.html` in a browser, or run:

```bash
npm run start   # rebuilds the data bundle and serves the app at http://localhost:5173
```

## What's here

| Tab | What it shows |
|---|---|
| **Overview** | Total Mentions, Share of Voice, Net Sentiment Score, Reach/Impressions; mentions-over-time line chart; mention volume by platform; top trending keywords; an auto-generated, topic-grouped summary feed. |
| **Live Mentions** | Every news/press/blog mention, with source, author, headline, snippet, date, reach, and sentiment tag. Search, source-type filter, and sort by newest/reach. |
| **Social Listings** | Cross-platform social post feed (X, LinkedIn, YouTube, Reddit, Instagram) with engagement metrics and influencer-tier filtering. Currently **sample data only** — see below. |
| **Sentiment Analysis** | Sentiment distribution donut, sentiment trend line, aspect-based breakdown (Product, Customer Service, Leadership, Bank Integrations), and a Risk & Alerts panel for high-reach negative mentions. |

A global date-range filter (Today / Last 7 Days / Last 30 Days / YTD / Custom)
drives every metric, chart, and feed across all four tabs.

## Data honesty — what's real vs. sample

This was built in a sandboxed environment with **no general internet
egress** (outbound HTTP to arbitrary domains — news sites, social APIs — is
blocked by network policy; only package registries and Anthropic's own
search tool are reachable). That shaped two decisions:

1. **`data/mentions.seed.json`** — 13 real Mintoak media mentions, sourced
   via web search (Business Standard, Inc42, PR Newswire, The Paypers,
   TradingView, Manila Times, CXOToday, FinTech Magazine, IndiaInfoline,
   AOL), covering the ICC Loyalty acquisition, the Visa partnership, the
   Axis Bank partnership, the 2023 PayPal Ventures round, and the HDFC Bank
   stake. URLs are real and were returned by web search, but this sandbox
   could not perform the live HTTP status check itself (see **Link
   verification** below) — run `npm run verify:links` from a machine with
   normal internet access before trusting the "Link status" badge in
   production.
2. **`data/social.sample.json`** — Social Listings has **no connected
   platform API**, so every record in it is a clearly-labeled, fictional
   placeholder (`"sample": true`, a `SAMPLE` badge in the UI, and a banner
   at the top of the tab). It exists to prove out the UI shape, not to
   represent real posts about Mintoak. Do not remove the SAMPLE badges
   without replacing the underlying data with a real API response.

## Strict context-disambiguation filter

`js/filters.js` → `classifyMintoakRelevance()` is what the "Live Mentions"
spec calls the disambiguation filter. It requires:

- the text contains "Mintoak" / "Mint Oak" as an entity, **and**
- it does **not** match an exclude-list (botanical mint/oak references,
  real-estate "Mint Oak" projects, generic gardening/furniture content),
  **and**
- it matches at least one fintech/merchant/banking context keyword
  (`fintech`, `merchant`, `payments`, `SME`, `bank`, `SaaS`, `QR`, `UPI`,
  the named bank/partner entities, etc.)

Every mention in `getAllMentions()` is run through this before it reaches
the UI. Extend `MINTOAK_CONTEXT_KEYWORDS` / `MINTOAK_EXCLUDE_KEYWORDS` in
that file as real-world false positives/negatives turn up.

## Deduplication

`js/dedupe.js` clusters near-identical headlines (Jaccard similarity over
tokenized headline words, threshold 0.55) and collapses syndicated
press-release copies into one card with a "Also syndicated to N other
outlets" note — see the Visa/PR Newswire cluster in Live Mentions for an
example (5 outlets carried the same release; the feed shows 2 distinct
headline variants).

## Sentiment scoring

`js/sentiment.js` is a transparent, dependency-free lexicon scorer
(positive/negative keyword lists → label + confidence %) so the dashboard
works fully offline with no API key. It returns `{ label, confidence,
score }`; every downstream consumer (Overview, Live Mentions, Sentiment
tab) only depends on that shape, so swapping in a real NLP/LLM sentiment
API is a one-function change — see **Connecting Live Data** below.

Aspect-based sentiment (`classifyAspects()`) buckets a mention into
Product/Platform, Customer Service, Leadership/Management, and Bank
Integrations by keyword match, then the same lexicon scorer runs per
aspect.

## Link verification

Because a browser tab cannot read the real HTTP status of a cross-origin
request (`no-cors` mode gives you "did it resolve", not "was it 200"),
verification happens in two layers:

- **`js/linkVerify.js`** (runs in the browser): `scrubUrl()` strips
  tracking parameters (`utm_*`, `fbclid`, `gclid`, `mc_cid`, …) and forces
  `https://`; `getDomainAuthority()` flags whether the domain is on a
  known-outlet allowlist; `verifyLinkReachability()` does a best-effort
  browser-side reachability probe.
- **`scripts/verify-links.mjs`** (Node, needs real internet access — run it
  from your dev machine or CI, not from a locked-down sandbox): performs an
  authoritative `HEAD` (falling back to `GET`) against every mention URL
  and writes `linkStatus: { httpStatus, ok, https, domainAuthority,
  checkedAt }` back into `data/mentions.seed.json`. The UI reads this field
  when present (see the "Link status" badge in Live Mentions) and shows
  "not yet checked" otherwise — it does not fabricate a status.

Run it, then rebuild the baked-in data bundle:

```bash
npm run verify:links   # node scripts/verify-links.mjs && node scripts/build-data.mjs
```

All outbound links render with `target="_blank" rel="noopener noreferrer"`.

## Auto-refresh & export

- The refresh indicator ticks and the dashboard re-renders every 5 minutes
  (`appState.autoRefreshMinutes` in `js/app.js`); "Refresh now" triggers it
  immediately.
- **Export CSV** (Live Mentions tab) exports the currently filtered/sorted
  mention set.
- **Export PDF** (top bar) generates a report with the current range's key
  metrics, the auto-summary bullets, and the in-range mention list, via
  jsPDF.

## Connecting live data (production wiring)

Everything above is built against small, explicit interfaces so real
sources can be swapped in without touching the UI layer:

| Interface | File | Replace with |
|---|---|---|
| `loadRawMentions()` | `js/data.js` | A real news/PR aggregation API — e.g. NewsAPI, Meltwater, Brandwatch, Google Alerts RSS, or a custom crawler — returning the same `{ id, source, sourceType, author, headline, snippet, url, publishedDate, domain, topic }` shape. |
| `loadRawSocial()` | `js/data.js` | X API v2, LinkedIn Marketing API, YouTube Data API v3, Reddit API (PRAW/OAuth), Instagram Graph API — normalized to the `social.sample.json` shape. |
| `scoreSentiment(text)` | `js/sentiment.js` | A real NLP/LLM sentiment endpoint (must still return `{ label, confidence }`). |
| `scripts/verify-links.mjs` | — | Already production-ready; just needs to run somewhere with outbound internet (cron/CI), on a schedule matching your refresh cadence. |
| `SOV_COMPETITOR_BASELINE` | `js/data.js` | Replace the illustrative multiplier with a real named-competitor mention count from the same pipeline. |

None of these require touching `app.js` or any tab-rendering code — they
all consume the same downstream shape.

## Design

Follows Mintoak's brand system: Lato typeface, Deep Mint (#48821C) / Mint
(#80C341) accent greens, Forest Ink (#222A1E) dark surface, 12px rounded
corners, soft low-spread shadows, sentence-case copy, no emoji. Dark mode
toggle persists via `localStorage`; the "system" default follows
`prefers-color-scheme`.

## File layout

```
index.html                  App shell, tab containers, global filter bar
css/styles.css               All styling (light + dark theme via CSS variables)
js/filters.js                Context-disambiguation filter + date-range filter
js/sentiment.js              Lexicon sentiment scorer + aspect classification
js/dedupe.js                 Syndicated-content clustering/dedup
js/linkVerify.js             URL scrubbing, domain authority, reachability probe
js/data.js                   Runtime data layer (loads + enriches raw records)
js/data.generated.js         AUTO-GENERATED from data/*.json — do not hand-edit
js/charts.js                 Chart.js wrappers (line/bar/donut), theme-aware
js/export.js                 CSV + PDF export
js/tabs/overview.js          Overview tab
js/tabs/liveMentions.js      Live Mentions tab
js/tabs/socialListings.js    Social Listings tab
js/tabs/sentimentTab.js      Sentiment Analysis tab
js/app.js                    App state, tab routing, wiring, auto-refresh
data/mentions.seed.json      Real seed dataset (see Data honesty above)
data/social.sample.json      SAMPLE-only social data (see Data honesty above)
scripts/build-data.mjs       Bakes data/*.json into js/data.generated.js
scripts/verify-links.mjs     Authoritative HTTP status check (needs real egress)
vendor/                      Locally vendored Chart.js 4.5.1 + jsPDF 4.2.1 (no CDN dependency)
```
