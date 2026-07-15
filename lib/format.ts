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
