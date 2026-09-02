#!/usr/bin/env node
/**
 * One-time enrichment: adds a `country` field to every mention in
 * data/mentions.seed.json, derived from the outlet's home country/HQ
 * (not the story's subject matter). Used to power the geography
 * distribution chart. Run once; the mapping below is the source of
 * truth for future additions too — extend DOMAIN_COUNTRY as new
 * outlets are added to the dataset.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "..", "data", "mentions.seed.json");

const DOMAIN_COUNTRY = {
  // India
  "business-standard.com": "India", "livemint.com": "India",
  "economictimes.indiatimes.com": "India", "moneycontrol.com": "India",
  "inc42.com": "India", "entrackr.com": "India", "yourstory.com": "India",
  "cxotoday.com": "India", "indiainfoline.com": "India",
  "financialexpress.com": "India", "hindustantimes.com": "India",
  "timesofindia.indiatimes.com": "India", "indianstartupnews.com": "India",
  "siliconindia.com": "India", "eletsonline.com": "India",
  "theindiabizz.com": "India", "financeoutlookindia.com": "India",
  "startupnews.fyi": "India", "startupstorymedia.com": "India",
  "indianstartuptimes.com": "India", "ipocentral.in": "India",
  "businesstoday.in": "India", "indiasnews.net": "India",
  "tribuneindia.com": "India", "siasat.com": "India", "axis.bank.in": "India",
  "tracxn.com": "India", "mediabrief.com": "India",
  "analyticsinsight.net": "India", "adgully.com": "India",
  "outlookbusiness.com": "India", "aninews.in": "India",
  "latestly.com": "India", "fiinews.com": "India",
  "passionateinmarketing.com": "India", "apnnews.com": "India",
  "marcamoney.com": "India", "in.investing.com": "India", "mintoak.com": "India",
  // United States
  "cbinsights.com": "United States", "aol.com": "United States",
  "businesswire.com": "United States", "bloomberg.com": "United States",
  "forbes.com": "United States", "techcrunch.com": "United States",
  "paypal-corp.com": "United States", "shopifreaks.com": "United States",
  "tradingview.com": "United States", "prnewswire.com": "United States",
  "indianewengland.com": "United States", "investing.com": "United States",
  "finance.yahoo.com": "United States", "reuters.com": "United States",
  // United Kingdom
  "fintechmagazine.com": "United Kingdom", "fintechfutures.com": "United Kingdom",
  "electronicpaymentsinternational.com": "United Kingdom",
  "ibsintelligence.com": "United Kingdom", "prnewswire.co.uk": "United Kingdom",
  // Netherlands
  "thepaypers.com": "Netherlands", "dealroom.co": "Netherlands",
  // UAE
  "gccbusinessnews.com": "United Arab Emirates", "zawya.com": "United Arab Emirates",
  "adgully.me": "United Arab Emirates",
  // Saudi Arabia
  "jawlah.co": "Saudi Arabia", "entarabi.com": "Saudi Arabia",
  // Nigeria
  "businessday.ng": "Nigeria",
  // South Africa
  "vftt.co.za": "South Africa",
  // Kenya
  "techtrendske.co.ke": "Kenya",
  // Philippines
  "manilatimes.net": "Philippines",
  // Malaysia
  "themalaysianreserve.com": "Malaysia",
  // Singapore
  "ceoinsightsasia.com": "Singapore",
  // Australia
  "aap.com.au": "Australia",
  // United States (entrepreneur.com is US-HQ; India edition content still published from the US-based masthead)
  "entrepreneur.com": "United States",
  "indiantelevision.com": "India", "exchange4media.com": "India"
};

async function main() {
  const raw = await readFile(DATA_PATH, "utf-8");
  const mentions = JSON.parse(raw);

  const missing = new Set();
  mentions.forEach((m) => {
    const country = DOMAIN_COUNTRY[m.domain];
    if (!country) {
      missing.add(m.domain);
      m.country = "Unknown";
    } else {
      m.country = country;
    }
  });

  if (missing.size) {
    console.log("No country mapping for domains:", [...missing].join(", "));
  }

  await writeFile(DATA_PATH, JSON.stringify(mentions, null, 2) + "\n", "utf-8");
  console.log(`Wrote country field for ${mentions.length} mentions.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
