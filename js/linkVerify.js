/**
 * Link verification & URL hygiene.
 *
 * Two layers, because a browser tab cannot make an authoritative cross-origin
 * HTTP status check (CORS restricts reading the real status of a `no-cors`
 * request to "did it resolve", not "was it 200"):
 *
 *   1. scrubUrl() / getDomainAuthority() run synchronously in the browser and
 *      are authoritative — they only inspect the URL string itself.
 *   2. verifyLinkReachability() does a best-effort browser-side reachability
 *      probe for the "checking…" UI state.
 *   3. scripts/verify-links.mjs (Node, run at build/refresh time with real
 *      egress — see README) performs the authoritative HEAD/GET 200-OK check
 *      and writes the result into each mention's `linkStatus` field, which
 *      this file simply reads when present.
 */
const TRACKING_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
  "fbclid", "gclid", "gclsrc", "dclid", "mc_cid", "mc_eid", "igshid", "igsh",
  "ref", "ref_src", "ref_url", "spm", "ncid", "cmpid", "cid", "icid", "si", "s"
];

const TRUSTED_DOMAINS = new Set([
  "business-standard.com", "livemint.com", "economictimes.indiatimes.com",
  "prnewswire.com", "businesswire.com", "reuters.com", "bloomberg.com",
  "forbes.com", "techcrunch.com", "inc42.com", "entrackr.com",
  "moneycontrol.com", "cxotoday.com", "thepaypers.com", "fintechmagazine.com",
  "tradingview.com", "manilatimes.net", "indiainfoline.com", "mintoak.com",
  "yourstory.com", "financialexpress.com", "hindustantimes.com",
  "timesofindia.indiatimes.com", "aol.com", "aap.com.au", "linkedin.com",
  "twitter.com", "x.com", "youtube.com", "reddit.com", "instagram.com",
  "prnewswire.co.uk", "en.prnasia.com", "fintechfutures.com",
  "electronicpaymentsinternational.com", "entrepreneur.com", "adgully.com",
  "axis.bank.in", "cbinsights.com", "tracxn.com", "ibsintelligence.com",
  "mediabrief.com", "analyticsinsight.net", "tribuneindia.com",
  "indianstartupnews.com", "siliconindia.com", "eletsonline.com"
]);

function scrubUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.protocol === "http:") u.protocol = "https:";
    TRACKING_PARAMS.forEach((p) => u.searchParams.delete(p));
    // Drop a trailing "?" left by an emptied query string.
    let out = u.toString();
    if (out.endsWith("?")) out = out.slice(0, -1);
    return out;
  } catch (e) {
    return rawUrl;
  }
}

function getHostname(rawUrl) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

function isHttps(rawUrl) {
  try {
    return new URL(rawUrl).protocol === "https:";
  } catch (e) {
    return false;
  }
}

function getDomainAuthority(rawUrl) {
  const host = getHostname(rawUrl);
  if (TRUSTED_DOMAINS.has(host)) {
    return { trusted: true, host, label: "Verified domain" };
  }
  return { trusted: false, host, label: "Unrecognized domain — review before trusting" };
}

/**
 * Best-effort browser-side reachability probe. Because of `no-cors`, a
 * resolved promise only means "the request was sent and something answered"
 * — it cannot distinguish 200 from 404 for cross-origin URLs. Treat this as
 * a "still online" signal only; the authoritative 200-OK check is the Node
 * script (scripts/verify-links.mjs).
 */
async function verifyLinkReachability(rawUrl, timeoutMs = 6000) {
  const url = scrubUrl(rawUrl);
  if (!isHttps(url)) {
    return { url, reachable: false, note: "Not HTTPS" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(url, { method: "HEAD", mode: "no-cors", signal: controller.signal });
    clearTimeout(timer);
    return { url, reachable: true, note: "Responded (browser-side, status not readable cross-origin)" };
  } catch (e) {
    clearTimeout(timer);
    return { url, reachable: false, note: e.name === "AbortError" ? "Timed out" : "Request failed" };
  }
}

async function verifyLinksBatch(items, concurrency = 4) {
  const queue = [...items];
  const results = new Map();

  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      const result = await verifyLinkReachability(item.url);
      results.set(item.id, result);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}
