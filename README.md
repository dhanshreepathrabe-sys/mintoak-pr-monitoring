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
| **Overview** | Total Mentions, Share of Voice, Net Sentiment Score, Reach/Impressions, Total PR Value; mentions-over-time line chart; mention volume by platform; mentions by country and by region; top trending keywords; an auto-generated, topic-grouped summary feed. |
| **Live Mentions** | Every news/press/blog mention, with source, country, author, headline, snippet, date, reach, PR Value, and sentiment tag. Search, source-type filter, region filter, and sort by newest/reach/PR Value; a "Showing X of Y" line makes the filtered vs. total count explicit. |
| **Social Listings** | Cross-platform social post feed (X, LinkedIn, YouTube, Reddit, Instagram, Facebook) with author-tier filtering. Real posts found via web search — see **Data honesty** below for what that does and doesn't get you. |
| **Sentiment Analysis** | Sentiment distribution donut, sentiment trend line, aspect-based breakdown (Product, Customer Service, Leadership, Bank Integrations), and a Risk & Alerts panel for high-reach negative mentions. |

A global date-range filter drives every metric, chart, and feed across all
four tabs. It defaults to **All Time** (everything in the dataset), with
Today / Last 7 Days / Last 30 Days / YTD / Custom available to narrow down.

## Data honesty — what's real vs. sample

This was built in a sandboxed environment with **no general internet
egress** (outbound HTTP to arbitrary domains — news sites, social APIs — is
blocked by network policy; only package registries and Anthropic's own
search tool are reachable). That shaped two decisions:

1. **`data/mentions.seed.json`** — 77 real Mintoak media mentions (48
   distinct stories after dedup), sourced via web search across roughly 56
   outlets — including regional press on five continents: Nigeria
   (Businessday NG), Malaysia (The Malaysian Reserve), South Africa (Zawya,
   VFTT), Saudi Arabia (Jawlah, entARABI), Singapore (CEO Insights Asia),
   Kenya (TechTrends Kenya), the UAE (Adgully Middle East, GCC Business
   News), and New Zealand (Yahoo Finance) — alongside Business Standard,
   Inc42, Entrackr, PR Newswire (US/UK), The Paypers, TradingView, Manila
   Times, CXOToday, FinTech Magazine, FinTech Futures, YourStory,
   Entrepreneur India, Adgully, IndiaInfoline, AOL, IBS Intelligence,
   Mediabrief, Analytics Insight, The Tribune, Indian Startup News,
   SiliconIndia, Elets BFSI, ANI, LatestLY, Outlook Business, Business
   Today, Siasat Daily, India New England News, Finance Outlook India, IPO
   Central, Startup Story, Indian Startup Times, TheIndiaBizz, Startup News
   FYI, Investing.com/IANS, Marca Money, APN
   News, Passionate In Marketing, Shopifreaks, Axis Bank's own newsroom,
   and PayPal's own newsroom. Covers the ICC Loyalty acquisition (including
   Entrackr's early scoop months before the official announcement, and the
   BlackSoil debt financing behind it), the Digiledge (CBDC/bill-payments)
   acquisition, the Visa partnership, the Axis Bank "neo for merchants"
   launch and the separate SME partnership announcement, the May-2024
   SEA/MENA leadership expansion, four separate funding events (the 2021
   and Dec-2022 HDFC stakes, the Feb-2023 $20M PayPal-led Series A, the
   Jan-2025 Z3Partners secondary, and the Dec-2025 Series A extension at a
   $280M valuation), and several leadership profiles/interviews of CEO
   Raman Khanduja. Also checked and came up genuinely empty: Hindi-language
   and Arabic-language press specifically (searched directly in both
   scripts — the entARABI piece that's included is its English edition,
   since no separately-indexed Arabic-language article for it was found),
   Vietnamese/Thai PR Newswire pickups, Moneycontrol/NDTV/The Wire/The
   Hindu Businessline/The Economic Times (all confidently claimed by the
   Google Drive file discussed below, none independently confirmed), and
   South Korean/Egyptian coverage of the ICC Loyalty deal — not included
   because nothing real turned up,
   not because the search wasn't tried. The most recent addition, Indian
   Startup Times' "India's Fintech Power List: 50 Leaders to Watch in
   2026" feature on CEO Raman Khanduja, didn't have a stated publish date
   in search results, so its `2026-01-20` date was derived from decoding
   three separate LinkedIn posts announcing the list (Snowflake-style IDs
   whose high bits are a literal Unix ms timestamp via `id >> 22`) — all
   three independently decoded to within 32 minutes of each other, which
   is stronger corroboration than a single unverified date claim would
   be. URLs are real and were returned by
   web search, but this
   sandbox could not perform the live HTTP status check itself (see **Link
   verification** below) — run `npm run verify:links` from a machine with
   normal internet access before trusting the "Link status" badge in
   production.
2. **`data/social.seed.json`** — Social Listings has **no authenticated
   platform API** (checked: none of the connected marketing tools —
   Supermetrics, Windsor.ai, Porter Metrics — have a real Mintoak social
   account authorized), so instead of fabricating engagement metrics, these
   are **10 real, third-party-only posts found via public web search**
   (`site:linkedin.com`, `site:youtube.com`, `site:facebook.com`, etc.) or
   submitted directly by the user after finding them by hand
   across LinkedIn, YouTube and Facebook — each with `metricsAvailable:
   false`, so the UI shows "Engagement data unavailable" rather than a
   made-up like/comment count. **Mintoak's own official channels (its
   website, and its own LinkedIn/X/Instagram/Facebook/YouTube posts) are
   deliberately excluded** — the team already knows what it publishes
   itself, so an earlier pass that filled this tab mostly with Mintoak's
   own posts (tagged `authorTier: "Owned Channel"`) was the wrong shape for
   a listening feed; those records were removed. A VentureDesk LinkedIn
   post was also removed after the user reported the link no longer
   resolves — a reminder that "found via search" isn't the same as "still
   live," which is exactly what the (currently unautomated) link
   verification step in this project exists to catch. What remains is real
   outside voices — `StartupRo`, `The CEO Magazine India`, individual
   creators, a personal post from one of Mintoak's own newly-hired
   regional leads, YourStory's own Facebook page sharing its coverage, and
   third-party podcast/interview videos — still thin, because public
   search indexes very little third-party chatter about a B2B
   merchant-payments platform, and no Reddit mentions were found at all.
   Every post carries its **actual publish date**: `dateConfidence:
   "exact"` when a search result stated it directly, `"estimated"` when
   it's a well-reasoned estimate — either anchored to the news event the
   post is visibly reacting to, or (for LinkedIn/X) decoded from the
   post's own numeric ID: both platforms use Snowflake-style IDs whose
   high bits are a literal Unix millisecond timestamp, recoverable as
   `id >> 22`. That's how the Jajabor Brand Consultancy post
   (`s-li-jajabor-fintech-comms`) got its `2026-08-06` date — LinkedIn
   itself was unreachable (blocked for automated fetch in this
   environment) to confirm the post's text, so only what's independently
   checkable (the URL is real, the ID decodes to a date matching the ICC
   Loyalty PR wave Jajabor — Mintoak's own PR agency — was running) is
   recorded; the exact wording is not asserted. Shown in the UI with a
   `~` prefix and an explanatory hover, never a crawl/discovery date. A
   `WEB SEARCH` badge marks every record as web-search-sourced rather
   than API-sourced.

**On "1210+ social listings and 50+ mentions"**: 50+ real mentions turned
out to be findable — the 77 raw / 48 distinct here clear it. 1210+ social
listings did not, and realistically can't via web search: individual
posts on X, Instagram and (mostly) LinkedIn aren't search-engine-indexed
at the level of a specific status update — search surfaces a company's
profile pages, its more prominent public posts, and syndicated news-media
social shares, which is exactly what these 9 (third-party-only) records
are. A number like 1,210 is the shape of what a real social-listening API
(X API v2, LinkedIn, Meltwater, Brandwatch, Sprinklr, etc.) returns — it
counts things like replies, retweets-with-comment and
impressions-adjacent mentions that a search index was never built to
surface individually. Wiring one of those up (see **Connecting live
data** below) is the actual path to that number; no further web-search
crawling will get there honestly.

**A word on the connected Google Drive**: it was checked for real PR
agency material per a later request, and turned up files that look like
agency reporting but show strong signs of AI fabrication (identical URLs
reused across different "publications," fabricated news-outlet domains,
a "PR Analysis" doc whose citation links literally carry
`?utm_source=chatgpt.com`). Only the handful of items independently
re-verified via web search (with the *real* URLs, not the file's) were
added — a 1,202-row "regional pickups" report in that Drive was not
imported at all. Worth raising directly with whoever produced it.

## Strict context-disambiguation filter

`js/filters.js` → `classifyMintoakRelevance()` is what the "Live Mentions"
spec calls the disambiguation filter. It treats the two spellings
differently, because they carry different amounts of ambiguity:

- **"Mintoak" (one word)** is unambiguous — nobody writes the plant/tree/
  real-estate sense that way — so it's accepted on its own, minus the
  exclude-list check. (An earlier version required a fintech-keyword match
  even here, which silently dropped real, on-topic coverage whose text
  just didn't happen to contain one of the listed words — e.g. a pure
  leadership-hire story. Fixed by only requiring the keyword gate for the
  genuinely ambiguous case below.)
- **"Mint Oak" (spaced)** is genuinely ambiguous — could be the company
  written with a space, or the plant/tree/real-estate sense — so it's only
  accepted when it also matches an exclude-list miss **and** at least one
  fintech/merchant/banking context keyword (`fintech`, `merchant`,
  `payments`, `SME`, `bank`, `SaaS`, `QR`, `UPI`, the named bank/partner
  entities, etc.).

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

## PR Value methodology

Every mention shows a **PR Value** (an illustrative Earned Media Value /
EMV estimate in INR) — the "Total PR Value" card on Overview, a "PR Value
≈" line on each Live Mentions card, a PR Value sort option, and a column
in the CSV export. `computePRValue()` in `js/data.js` is one small,
fully-inspectable formula:

```
PR Value = Reach
         × ₹0.02 per reach point                        (PR_VALUE_INR_PER_REACH_POINT)
         × domain authority multiplier (1.0 trusted / 0.5 unrecognized)
         × sentiment multiplier (1.15 positive / 1.0 neutral / 0.5 negative)
         × (1 + 0.1 × syndicated-outlet count)
```

Reach itself is the same deterministic, documented estimate described
above (domain authority × source-type weight × a stable per-item factor)
— there's no separate hidden number here, just that same Reach run
through one more formula. `formatINR()` renders it Indian-style (₹X.XX
Cr / ₹X.XX L / ₹X.XK), matching Mintoak's brand convention.

**Worth being direct about why this exists in this exact shape.** While
looking at the connected Google Drive for real PR reporting (see **Data
honesty** above), `Mintoak_PR_Coverage_2026-08-11.xlsx` turned out to
carry a "PR Value" column with numbers that had no stated relationship to
anything else in the row — plausible-looking ₹ figures with no visible
method, sitting next to reach numbers that didn't correlate with them.
This dashboard's PR Value is built the opposite way on purpose: every
input is a field already on the mention, every multiplier is a named
constant in `js/data.js` you can read and change, and the whole
computation is reproducible from the formula above. It is still an
**estimate, not an audited or industry-benchmarked AVE figure** — a real
one needs an actual ad-rate card or a licensed provider (Cision,
Meltwater, Muck Rack). Swap `computePRValue()` for a call to one of those
when real ad-equivalency data is available; nothing downstream needs to
change beyond that one function, same as `estimateReach()`.

## Geography

Every mention carries a `country` field — the reporting **outlet's home
country/HQ**, not the story's subject matter (an India-based outlet
covering a UAE acquisition is still counted under India). It's added by
`scripts/add-geography.mjs`, a one-time enrichment script whose
`DOMAIN_COUNTRY` map is the source of truth — extend it there (and the
mirrored `REGION_BY_COUNTRY` map in `js/data.js`) when a new outlet's
domain is added to `data/mentions.seed.json`, then re-run
`node scripts/add-geography.mjs` and rebuild.

`getGeographyDistribution()` in `js/data.js` groups mentions two ways:
by raw country (the Overview "Mentions by country" bar chart) and by a
seven-region bucketing — India, Middle East, Africa, Southeast Asia,
North America, Europe, Oceania (the "Mentions by region" panel, and the
region filter on Live Mentions). As of this dataset that's 48 distinct
stories across 12 countries and 6 regions, dominated by India (where
Mintoak is headquartered and most of its press coverage originates) —
see the Overview tab for the live current breakdown.

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
| `loadRawSocial()` | `js/data.js` | X API v2, LinkedIn Marketing API, YouTube Data API v3, Reddit API (PRAW/OAuth), Instagram Graph API — normalized to the `social.seed.json` shape (drop `metricsAvailable: false` once real engagement numbers are available). Filter out the account's own posts at the query level (e.g. exclude Mintoak's own author/account IDs) — this tab is for third-party listening, not a mirror of owned-channel output. |
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
js/data.js                   Runtime data layer (loads + enriches raw records, incl. PR Value)
js/data.generated.js         AUTO-GENERATED from data/*.json — do not hand-edit
js/charts.js                 Chart.js wrappers (line/bar/donut), theme-aware
js/export.js                 CSV + PDF export
js/tabs/overview.js          Overview tab
js/tabs/liveMentions.js      Live Mentions tab
js/tabs/socialListings.js    Social Listings tab
js/tabs/sentimentTab.js      Sentiment Analysis tab
js/app.js                    App state, tab routing, wiring, auto-refresh
data/mentions.seed.json      Real seed dataset (see Data honesty above)
data/social.seed.json        Real, web-search-discovered social posts (see Data honesty above)
scripts/build-data.mjs       Bakes data/*.json into js/data.generated.js
scripts/verify-links.mjs     Authoritative HTTP status check (needs real egress)
scripts/build-artifact.mjs   Bundles the whole app into one self-contained HTML file for the published Artifact
scripts/add-geography.mjs    One-time enrichment: adds outlet-domain → country to data/mentions.seed.json
vendor/                      Locally vendored Chart.js 4.5.1 + jsPDF 4.2.1 (no CDN dependency)
```

## Automated daily refresh

A Routine (`trig_0189LdJZeUhHvTJPmnNzo8Ao`, cron `0 6 * * *`, ~06:00 UTC
daily) fires a fresh, standalone session each day that:

1. Reads the current `data/mentions.seed.json` and `data/social.seed.json`
   to know what already exists (dedupes new finds against these by URL).
2. Runs the same web-search queries described in **Data honesty** above,
   looking for press coverage from roughly the last few days and new
   public social posts, applying the same disambiguation/honesty rules
   (real URLs only, no fabricated dates or engagement metrics, cap of ~8
   new mentions per run).
3. If anything genuinely new was found: runs `npm run build:artifact`,
   sanity-checks the rebuilt file, commits, pushes to
   `claude/mintoak-pr-dashboard-6mod92`, and republishes the same
   Artifact (`https://claude.ai/code/artifact/aa027e8f-0439-4fce-ba91-2835bbacfdf8`).
   If nothing new was found, it does nothing — no empty commits.

**Known caveat, not yet verified:** the fired session's tool grant (echoed
back when the trigger was created) listed Bash/git/WebSearch/file tools
but not the `Artifact` tool explicitly. It may still work if the
environment runs Routine sessions in a permissive mode, but this hasn't
been confirmed against a real firing yet — check that the Artifact link
actually updated after the first run, and if it didn't, the repo commits
(steps 1–3 above) are the fallback signal that the crawl itself is
working even if the last step silently failed.

Manage the Routine like any other: `list_triggers` to check its last-run
status, `update_trigger` to change the schedule or pause it, `fire_trigger`
to run it on demand instead of waiting for the next scheduled time.
