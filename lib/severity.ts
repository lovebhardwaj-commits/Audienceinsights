// Shared severity vocabulary (Part 2.2). Chrome is neutral; color means Good / Warning
// / Serious / Critical, and nothing else. One frequency scale is reused everywhere a
// frequency value renders (KPI cards, Partnership tiles, tables) so the reading is
// consistent across the whole product.

export type Severity = "good" | "warning" | "serious" | "critical";

/** Frequency severity: <2.5 neutral · 2.5–3.5 warning · 3.5–5 serious · ≥5 critical. */
export function freqSeverity(f: number): Severity | undefined {
  if (!Number.isFinite(f) || f <= 0) return undefined;
  if (f >= 5) return "critical";
  if (f >= 3.5) return "serious";
  if (f >= 2.5) return "warning";
  return undefined;
}
