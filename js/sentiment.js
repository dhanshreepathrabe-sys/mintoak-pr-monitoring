/**
 * Lightweight lexicon-based sentiment scorer.
 *
 * This is a transparent, dependency-free stand-in so the dashboard works
 * fully offline. In production, swap `scoreSentiment()` for a call to a
 * real NLP/LLM sentiment service (see README > Connecting Live Data) —
 * the rest of the app only depends on the { label, confidence, score }
 * shape returned here, so the swap is a one-function change.
 */
const POSITIVE_WORDS = [
  "partnership", "growth", "expand", "expansion", "raises", "backing",
  "funding", "scale", "scaling", "profitab", "innovat", "launch", "unlock",
  "strengthen", "leading", "leader", "success", "milestone", "revenue growth",
  "award", "recognized", "acquire", "acquisition", "collaborat", "join forces",
  "empower", "digital-first", "deepen"
];

const NEGATIVE_WORDS = [
  "outage", "breach", "fraud", "lawsuit", "complaint", "decline", "delay",
  "layoff", "penalty", "fine", "downtime", "hack", "leak", "churn",
  "dissatisf", "failure", "glitch", "criticiz", "investigat", "probe",
  "scam", "risk of", "warns"
];

function scoreSentiment(text) {
  const t = (text || "").toLowerCase();
  let pos = 0;
  let neg = 0;
  POSITIVE_WORDS.forEach((w) => { if (t.includes(w)) pos += 1; });
  NEGATIVE_WORDS.forEach((w) => { if (t.includes(w)) neg += 1; });

  const total = pos + neg;
  let label = "Neutral";
  let score = 0;
  if (pos > neg) { label = "Positive"; score = pos - neg; }
  else if (neg > pos) { label = "Negative"; score = neg - pos; }

  // Confidence heuristic: more distinguishing signal words -> higher confidence.
  const confidence = total === 0 ? 55 : Math.min(97, 62 + total * 9 + Math.abs(pos - neg) * 4);

  return { label, confidence, score };
}

const ASPECTS = [
  { key: "product", label: "Product Features / Platform", keywords: ["platform", "product", "feature", "saas", "app", "software", "solution", "modular"] },
  { key: "service", label: "Customer Service", keywords: ["support", "service", "onboarding", "response time", "customer care"] },
  { key: "leadership", label: "Leadership / Management", keywords: ["ceo", "founder", "leadership", "khanduja", "management", "co-founder"] },
  { key: "integration", label: "Bank Integrations", keywords: ["bank", "hdfc", "axis", "integration", "acquirer", "acquiring", "visa"] }
];

function classifyAspects(text) {
  const t = (text || "").toLowerCase();
  return ASPECTS.filter((a) => a.keywords.some((k) => t.includes(k))).map((a) => a.key);
}

function aggregateSentiment(items, textFn) {
  const counts = { Positive: 0, Neutral: 0, Negative: 0 };
  items.forEach((item) => {
    const { label } = scoreSentiment(textFn(item));
    counts[label] += 1;
  });
  return counts;
}

function aggregateAspectSentiment(items, textFn) {
  const buckets = {};
  ASPECTS.forEach((a) => { buckets[a.key] = { label: a.label, Positive: 0, Neutral: 0, Negative: 0 }; });

  items.forEach((item) => {
    const text = textFn(item);
    const { label } = scoreSentiment(text);
    classifyAspects(text).forEach((key) => { buckets[key][label] += 1; });
  });

  return Object.values(buckets).filter((b) => b.Positive + b.Neutral + b.Negative > 0);
}
