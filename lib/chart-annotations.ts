// Auto-annotation (§3.4) — each chart labels its single most notable point so it
// states its own headline. Partial trailing periods are excluded so a half-formed
// bar never gets called the peak.

export interface ChartAnnotation {
  index: number;
  text: string;
  seriesKey: string;
}

interface NotableOptions {
  kind?: "max" | "min" | "steepest";
  /** Exclude a trailing partial index from consideration. */
  excludeIndex?: number;
  label?: (value: number, index: number) => string;
}

/** Returns the most notable point in `values` for series `seriesKey`, or null. */
export function notablePoint(values: number[], seriesKey: string, opts: NotableOptions = {}): ChartAnnotation | null {
  const { kind = "max", excludeIndex, label } = opts;
  const candidates = values
    .map((v, i) => ({ v, i }))
    .filter((p) => Number.isFinite(p.v) && p.i !== excludeIndex);
  if (candidates.length < 2) return null;

  let winner = candidates[0];
  if (kind === "steepest") {
    let maxDelta = -Infinity;
    for (let k = 1; k < candidates.length; k++) {
      const d = Math.abs(candidates[k].v - candidates[k - 1].v);
      if (d > maxDelta) { maxDelta = d; winner = candidates[k]; }
    }
  } else {
    for (const c of candidates) {
      if (kind === "max" ? c.v > winner.v : c.v < winner.v) winner = c;
    }
  }

  const text = label ? label(winner.v, winner.i) : kind === "min" ? "Low" : "Peak";
  return { index: winner.i, text, seriesKey };
}
