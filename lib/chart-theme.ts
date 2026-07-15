export const CHART_INK = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
} as const;

export const CHART_CHROME = {
  surface: "#fcfcfb",
  gridline: "#e1e0d9",
  axis: "#c3c2b7",
} as const;

/** Fixed-order categorical palette — assign by position, never cycle past index 7. */
export const CATEGORICAL_PALETTE = [
  "#2a78d6", // 1 blue
  "#1baf7a", // 2 aqua
  "#eda100", // 3 yellow
  "#008300", // 4 green
  "#4a3aa7", // 5 violet
  "#e34948", // 6 red
  "#e87ba4", // 7 magenta
  "#eb6834", // 8 orange
] as const;

/** For an unavoidable catch-all bucket ("Other", "Unknown") — never a hue slot. */
export const CHART_OTHER_COLOR = CHART_INK.muted;

export const STATUS_COLORS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const;

export interface FoldedSeries<T> {
  key: string;
  label: string;
  value: number;
  color: string;
  source: T[];
}

/**
 * Caps a dynamically-sized series list (e.g. weekly cohorts) at `maxDistinct` distinct
 * categorical colors by keeping the top entries by `getValue` and merging the rest into
 * a single "Other" bucket — a 9th generated hue would be indistinguishable under CVD.
 */
export function foldTopNPlusOther<T>(
  items: T[],
  maxDistinct: number,
  getKey: (item: T) => string,
  getLabel: (item: T) => string,
  getValue: (item: T) => number
): FoldedSeries<T>[] {
  const sorted = [...items].sort((a, b) => getValue(b) - getValue(a));
  const kept = sorted.slice(0, maxDistinct);
  const overflow = sorted.slice(maxDistinct);

  const folded: FoldedSeries<T>[] = kept.map((item, i) => ({
    key: getKey(item),
    label: getLabel(item),
    value: getValue(item),
    color: CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length],
    source: [item],
  }));

  if (overflow.length > 0) {
    folded.push({
      key: "__other__",
      label: `Other (${overflow.length})`,
      value: overflow.reduce((sum, item) => sum + getValue(item), 0),
      color: CHART_OTHER_COLOR,
      source: overflow,
    });
  }

  return folded;
}

/** Semantic reach-composition colors — use these instead of ad-hoc hex values. */
export const REACH_COLORS = {
  /** Net new / genuinely new audience — strong blue */
  new: "#2a78d6",
  /** Previously reached / repeat exposure — amber encodes "costly/wasteful" */
  existing: "#d97706",
  /** Engaged audience segment */
  engaged: "#7c3aed",
} as const;

/** Overlap chart colors */
export const OVERLAP_COLORS = {
  unique: "#2563EB",
  shared: "#EA580C",
} as const;

/** Neutral spend bar color — slate, not blue, so it doesn't collide with reach */
export const SPEND_COLOR = "#94a3b8";

/** Attribution window colors — semantically distinct (not three shades of blue) */
export const CONVERSION_COLORS = {
  /** Same-day conversion — strong blue (fast, reliable) */
  sameDay: "#1d4ed8",
  /** Day 2–7 — teal/cyan (consideration phase) */
  week: "#0891b2",
  /** Day 8–28 — amber (late intent, slow decision) */
  month: "#d97706",
  /** Uplift ratio overlay line — warm amber, contrasts well against blue/teal bars */
  upliftLine: "#f59e0b",
} as const;
