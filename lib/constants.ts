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
  description: string;
}

// Reports in scope — order matches sidebar.
// creative-churn temporarily hidden — timing out on 5-6 month ranges (heaviest
// report: full ad list + daily-granularity insights). Re-add once fixed.
export const REPORTS: ReportMeta[] = [
  { slug: "net-new-reach",      title: "New Reach",          description: "How many genuinely new people you reach each month" },
  { slug: "campaign-overlap",   title: "Overlap",            description: "Which campaigns compete for the same audience" },
  { slug: "conversion-windows", title: "Conversion Windows", description: "1d vs. 7d vs. 28d attribution windows compared" },
  { slug: "audience-segments",  title: "User Segments",      description: "New vs. engaged vs. existing — by account, campaign, adset, or ad" },
  { slug: "frequency",          title: "Frequency Heatmap",  description: "Campaign overexposure at a glance — week by week" },
  { slug: "partnership-ads",    title: "Partnership Ads",    description: "Creator vs. normal ad performance" },
];
