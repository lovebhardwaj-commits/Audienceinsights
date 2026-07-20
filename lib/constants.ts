import { CATEGORICAL_PALETTE, CHART_OTHER_COLOR } from "./chart-theme";
import type { SegmentKey } from "./types";

export const META_API_VERSION = process.env.META_API_VERSION || "v25.0";
export const META_GRAPH_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
export const META_OAUTH_DIALOG_BASE = `https://www.facebook.com/${META_API_VERSION}/dialog/oauth`;

export const OAUTH_SCOPES = "ads_read,pages_show_list,pages_read_engagement";

export const SEGMENT_ORDER: SegmentKey[] = [
  "prospecting",
  "engaged",
  "existing",
  "unknown",
];

/** Meta can return segment keys outside the documented four (empty string,
 *  new tiers) — fold anything unrecognized into "unknown" instead of crashing. */
export function normalizeSegmentKey(raw: unknown): SegmentKey {
  return SEGMENT_ORDER.includes(raw as SegmentKey) ? (raw as SegmentKey) : "unknown";
}

export const SEGMENT_LABELS: Record<SegmentKey, string> = {
  prospecting: "New Audience",
  engaged: "Engaged",
  existing: "Existing Customers",
  unknown: "Unknown",
};

// Semantic colors per design spec — never use these decoratively
export const SEGMENT_COLORS: Record<SegmentKey, string> = {
  prospecting: "#2563EB",  // Blue — new/prospecting
  engaged:     "#F59E0B",  // Amber — engaged
  existing:    "#10B981",  // Emerald — existing customers
  unknown:     CHART_OTHER_COLOR,
};

export const TOKEN_EXPIRY_WARNING_DAYS = 7;

export interface ReportMeta {
  slug: string;
  title: string;
  /** Sidebar/dashboard subtitle — kept ≤30 chars so it never truncates mid-word (D13). */
  description: string;
  /** Minimum months the *initial* auto-fetch should span so charts have enough points
   *  to be legible (D3/7.1). A user's explicit range pick always overrides this. */
  minUsefulMonths: number;
}

export const REPORTS: ReportMeta[] = [
  { slug: "net-new-reach",      title: "New Reach",          description: "Genuinely new people reached",   minUsefulMonths: 4 },
  { slug: "campaign-overlap",   title: "Overlap",            description: "Who competes for one audience",  minUsefulMonths: 1 },
  { slug: "conversion-windows", title: "Conversion Windows", description: "1d vs 7d vs 28d attribution",    minUsefulMonths: 2 },
  { slug: "audience-segments",  title: "User Segments",      description: "New vs engaged vs existing",     minUsefulMonths: 2 },
  { slug: "partnership-ads",    title: "Partnership Ads",    description: "Creator vs normal ads",          minUsefulMonths: 1 },
  { slug: "frequency",          title: "Frequency",          description: "Who sees your ads too often",    minUsefulMonths: 2 },
  { slug: "creative-churn",    title: "Creative Churn",     description: "Spend by creative launch cohort", minUsefulMonths: 3 },
];

/** Per-report minimum months for the initial fetch, keyed by slug (D3/7.1). */
export const MIN_USEFUL_MONTHS: Record<string, number> = {
  ...Object.fromEntries(REPORTS.map((r) => [r.slug, r.minUsefulMonths])),
  "creative-segments": 2,
};
