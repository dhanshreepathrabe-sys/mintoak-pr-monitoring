#!/usr/bin/env node
/**
 * Authoritative link verification for data/mentions.seed.json.
 *
 * Performs a real HTTP HEAD (falling back to GET if HEAD is rejected) against
 * every mention URL and writes back:
 *   linkStatus: { checkedAt, httpStatus, ok, https, domainAuthority }
 *
 * This script needs real outbound internet access. It was NOT runnable
 * inside the sandbox this dashboard was built in (that sandbox only allows
 * egress to package registries), so run it from your normal dev machine or
 * CI before deploying / refreshing the dashboard:
 *
 *   node scripts/verify-links.mjs
 *
 * Wire it into a cron / CI job for the "auto-refresh every 5 minutes"
 * requirement in production — see README > Connecting Live Data.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "..", "data", "mentions.seed.json");

const TRUSTED_DOMAINS = new Set([
  "business-standard.com", "livemint.com", "economictimes.indiatimes.com",
  "prnewswire.com", "businesswire.com", "reuters.com", "bloomberg.com",
  "forbes.com", "techcrunch.com", "inc42.com", "entrackr.com",
  "moneycontrol.com", "cxotoday.com", "thepaypers.com", "fintechmagazine.com",
  "tradingview.com", "manilatimes.net", "indiainfoline.com", "mintoak.com",
  "yourstory.com", "financialexpress.com", "hindustantimes.com",
  "timesofindia.indiatimes.com", "aol.com", "aap.com.au",
  "prnewswire.co.uk", "en.prnasia.com", "fintechfutures.com",
  "electronicpaymentsinternational.com", "entrepreneur.com", "adgully.com",
  "axis.bank.in", "cbinsights.com", "tracxn.com"
]);

async function checkUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    }
    clearTimeout(timer);
    return { httpStatus: res.status, ok: res.status >= 200 && res.status < 300 };
  } catch (err) {
    clearTimeout(timer);
    return { httpStatus: null, ok: false, error: err.message };
  }
}

async function main() {
  const raw = await readFile(DATA_PATH, "utf-8");
  const mentions = JSON.parse(raw);

  for (const mention of mentions) {
    let host = "";
    let https = false;
    try {
      const u = new URL(mention.url);
      host = u.hostname.replace(/^www\./, "");
      https = u.protocol === "https:";
    } catch {
      // leave host/https at defaults; checkUrl will fail below
    }

    const result = await checkUrl(mention.url);
    mention.linkStatus = {
      checkedAt: new Date().toISOString(),
      httpStatus: result.httpStatus,
      ok: result.ok,
      https,
      domainAuthority: TRUSTED_DOMAINS.has(host) ? "verified" : "unrecognized",
      error: result.error || null
    };

    console.log(
      `${mention.id}: ${result.ok ? "OK" : "FAIL"} (${result.httpStatus ?? "no response"}) — ${mention.url}`
    );
  }

  await writeFile(DATA_PATH, JSON.stringify(mentions, null, 2) + "\n", "utf-8");
  console.log(`\nWrote link status for ${mentions.length} mentions to ${DATA_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
