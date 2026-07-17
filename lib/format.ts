let _currency = "INR";
let _currencySymbol = "₹";
let _moneyLocale = "en-IN";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", CAD: "C$", AUD: "A$",
  BRL: "R$", MXN: "MX$", SGD: "S$", HKD: "HK$", KRW: "₩", THB: "฿",
  IDR: "Rp", PHP: "₱", VND: "₫", MYR: "RM", AED: "AED", SAR: "SAR",
  ZAR: "R", NGN: "₦", EGP: "E£", TRY: "₺", PLN: "zł", SEK: "kr",
  NOK: "kr", DKK: "kr", CZK: "Kč", HUF: "Ft", RON: "lei", BGN: "лв",
  PKR: "₨", BDT: "৳", LKR: "Rs", NPR: "Rs",
};

export function setCurrency(code: string) {
  _currency = code;
  _currencySymbol = CURRENCY_SYMBOLS[code] ?? code;
  // Indian accounts read money in lakh/crore grouping (₹3,48,44,548) and
  // compact units (₹5.8Cr), not thousands/millions.
  _moneyLocale = code === "INR" ? "en-IN" : "en-US";
}

export function getCurrencySymbol(): string {
  return _currencySymbol;
}

/** Full grouped number in the active locale — 16,626,347 (en-US) or 1,66,26,347 (en-IN). */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat(_moneyLocale, { maximumFractionDigits: 0 }).format(n);
}

/** Compact reach/count number — 16.60M (en-US) or 16.60L / 4.80Cr (en-IN). Always
 *  2 decimal places — never collapsed to a rounder, less precise whole number. */
export function formatCompactNumber(n: number): string {
  return new Intl.NumberFormat(_moneyLocale, { notation: "compact", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

/** Always 2 decimal places, regardless of magnitude — ₹1,01,32,704.43, not
 *  rounded to ₹1,01,32,704 just because the amount is large. */
export function formatCurrency(n: number): string {
  return `${_currencySymbol}${new Intl.NumberFormat(_moneyLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
}

export function formatCurrencyCompact(n: number): string {
  return `${_currencySymbol}${new Intl.NumberFormat(_moneyLocale, { notation: "compact", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
}

export function formatPercent(n: number, digits = 2): string {
  return `${n.toFixed(digits)}%`;
}

/** "2026-04-09" → "Apr 9" — for chart axes and legends. */
export function formatShortDate(iso: string): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// ── Entity label engine (Part 5, fixes D5) ─────────────────────────────────────
// Merchant campaign names share long boilerplate prefixes ("SR1503_Shesha_All
// Products_…"), so naive tail-ellipsis collapses 14 rows to identical strings.
// This strips the shared prefix once (shown as a caption) and middle-ellipsizes
// the distinguishing remainder so every row stays identifiable at a glance.

const MIN_PREFIX_LEN = 8;

export interface EntityLabels {
  /** The stripped common prefix (≥8 chars) shown once as a caption, or null. */
  prefix: string | null;
  /** Display labels: prefix removed, middle-ellipsized. Order matches input. */
  labels: string[];
  /** Original untruncated names, for tooltips/copy. Order matches input. */
  full: string[];
}

/** Longest common prefix across a set of strings. */
function longestCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return "";
  let prefix = strings[0];
  for (const s of strings) {
    while (!s.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }
  return prefix;
}

/** Keep head + tail, drop the middle: "Sales_AO_India_CPP…Product Specific". */
export function middleEllipsis(s: string, maxLen = 32): string {
  if (s.length <= maxLen) return s;
  const keep = maxLen - 1; // room for the ellipsis
  const head = Math.ceil(keep * 0.6);
  const tail = Math.floor(keep * 0.4);
  return `${s.slice(0, head)}…${s.slice(s.length - tail)}`;
}

export function formatEntityLabels(names: string[], maxLen = 32): EntityLabels {
  const full = [...names];
  if (names.length < 2) {
    return { prefix: null, labels: names.map((n) => middleEllipsis(n, maxLen)), full };
  }
  let prefix = longestCommonPrefix(names);
  // Only strip at a word/separator boundary so we don't cut mid-token.
  if (prefix.length >= MIN_PREFIX_LEN) {
    const boundary = Math.max(prefix.lastIndexOf("_"), prefix.lastIndexOf(" "), prefix.lastIndexOf("-"), prefix.lastIndexOf("|"));
    if (boundary >= MIN_PREFIX_LEN - 1) prefix = prefix.slice(0, boundary + 1);
  }
  const stripping = prefix.length >= MIN_PREFIX_LEN;
  const labels = names.map((n) => {
    const remainder = stripping ? n.slice(prefix.length) || n : n;
    return middleEllipsis(remainder, maxLen);
  });
  return { prefix: stripping ? prefix : null, labels, full };
}
