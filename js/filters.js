/**
 * Context disambiguation filter — keeps Mintoak (the fintech) mentions,
 * drops "mint oak" the plant/tree, unrelated personal names, real-estate
 * projects called "Mint Oak", etc.
 */
const MINTOAK_CONTEXT_KEYWORDS = [
  "fintech", "merchant", "payments", "payment", "acquiring", "acquirer",
  "sme", "smes", "msme", "banking", "bank", "saas", "platform", "merchant os",
  "hdfc", "axis bank", "visa", "paypal ventures", "qr", "upi", "pos",
  "loyalty", "engage360", "raman khanduja", "innovations pvt", "payment volume",
  "merchant app", "acquirers", "financial services", "embedded fintech"
];

const MINTOAK_EXCLUDE_KEYWORDS = [
  "mint plant", "mint leaves", "oak tree", "oak wood", "oak furniture",
  "botanical", "garden", "landscap", "real estate project", "villa", "township",
  "apartment", "residential project", "housing scheme", "herb", "recipe",
  "tea leaves", "forestry"
];

function normalize(text) {
  return (text || "").toLowerCase();
}

/** "mintoak" (one word, however capitalized) unambiguously names the company — nobody writes the plant/tree/real-estate sense that way. */
function mentionsUnambiguousMintoak(text) {
  return /\bmintoak\b/i.test(text || "");
}

/** "mint oak" (two words) is genuinely ambiguous — could be the company written with a space, or the plant/tree/real-estate sense. */
function mentionsAmbiguousMintOak(text) {
  return /\bmint\s+oak\b/i.test(text || "");
}

/**
 * Returns { relevant: boolean, reason: string } — used both to filter the
 * seed dataset and to show why an item was included/excluded (transparency
 * for the "strict context disambiguation" requirement).
 */
function classifyMintoakRelevance(item) {
  const haystack = normalize(`${item.headline} ${item.snippet} ${item.topic || ""} ${item.source || ""}`);

  const unambiguous = mentionsUnambiguousMintoak(haystack);
  const ambiguous = !unambiguous && mentionsAmbiguousMintOak(haystack);
  if (!unambiguous && !ambiguous) {
    return { relevant: false, reason: "Does not reference Mintoak / Mintoak Innovations." };
  }

  const hasExclusion = MINTOAK_EXCLUDE_KEYWORDS.some((kw) => haystack.includes(kw));
  if (hasExclusion) {
    return { relevant: false, reason: "Matches an excluded (botanical / unrelated) context." };
  }

  // "Mintoak" written as one word is unambiguous on its own — real company
  // news doesn't always happen to use one of the fintech keywords below
  // (e.g. a pure leadership-hire story). Only the genuinely ambiguous
  // spaced "mint oak" needs a fintech/business context word to confirm
  // it's this company and not the plant/tree/real-estate sense.
  if (unambiguous) {
    return { relevant: true, reason: "Unambiguous \"Mintoak\" entity match." };
  }

  const hasContext = MINTOAK_CONTEXT_KEYWORDS.some((kw) => haystack.includes(kw));
  if (!hasContext) {
    return { relevant: false, reason: "\"Mint oak\" is ambiguous and no fintech / merchant-payments / banking context was found alongside it." };
  }

  return { relevant: true, reason: "Ambiguous \"mint oak\" confirmed as the company by fintech/business context." };
}

function filterRelevantMentions(items) {
  return items.filter((item) => classifyMintoakRelevance(item).relevant);
}

/** Date-range filter shared by every tab. */
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getRangeBounds(rangeKey, customStart, customEnd, referenceDate) {
  const today = startOfDay(referenceDate || new Date());
  let start, end;
  end = new Date(today);
  end.setHours(23, 59, 59, 999);

  switch (rangeKey) {
    case "today":
      start = new Date(today);
      break;
    case "7d":
      start = new Date(today);
      start.setDate(start.getDate() - 6);
      break;
    case "30d":
      start = new Date(today);
      start.setDate(start.getDate() - 29);
      break;
    case "ytd":
      start = new Date(today.getFullYear(), 0, 1);
      break;
    case "custom":
      start = customStart ? startOfDay(customStart) : new Date(today.getFullYear(), 0, 1);
      end = customEnd ? new Date(new Date(customEnd).setHours(23, 59, 59, 999)) : end;
      break;
    default:
      start = new Date(today);
      start.setDate(start.getDate() - 29);
  }
  return { start, end };
}

function filterByDateRange(items, rangeKey, customStart, customEnd, referenceDate, dateField = "publishedDate") {
  const { start, end } = getRangeBounds(rangeKey, customStart, customEnd, referenceDate);
  return items.filter((item) => {
    const d = new Date(item[dateField]);
    return d >= start && d <= end;
  });
}
