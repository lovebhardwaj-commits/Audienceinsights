import { metaInsights } from "@/lib/meta-api";
import { num, cpmr, cpp, percent, extractPurchases } from "@/lib/calculations";
import { SEGMENT_ORDER, normalizeSegmentKey } from "@/lib/constants";
import type { DateRange, SegmentKey } from "@/lib/types";

export type EntityLevel = "campaign" | "adset" | "ad";

interface SegmentBucket {
  reach: number;
  spend: number;
  purchases: number;
}

/** Unified row shape for campaign / adset / ad segment breakdown */
export interface EntitySegmentRow {
  id: string;
  name: string;
  totalReach: number;
  totalSpend: number;
  totalPurchases: number;
  prospectingReach: number;
  prospectingReachPct: number;
  prospectingSpendPct: number;
  prospectingCpmr: number;
  prospectingPurchases: number;
  prospectingPurchasePct: number;
  prospectingCpa: number;
  engagedReach: number;
  engagedReachPct: number;
  engagedSpend: number;
  engagedCpmr: number;
  engagedPurchases: number;
  existingReach: number;
  existingReachPct: number;
  existingSpend: number;
  existingPurchases: number;
}

/** @deprecated Use EntitySegmentRow */
export type AdSegmentRow = EntitySegmentRow & { adId: string; adName: string };

export interface CreativeSegmentsReport {
  level: EntityLevel;
  entities: EntitySegmentRow[];
  /** @deprecated Use entities */
  ads: AdSegmentRow[];
}

export async function getCreativeSegmentsReport(
  token: string,
  accountId: string,
  range: DateRange,
  level: EntityLevel = "ad"
): Promise<CreativeSegmentsReport> {
  const idField = level === "campaign" ? "campaign_id" : level === "adset" ? "adset_id" : "ad_id";
  const nameField = level === "campaign" ? "campaign_name" : level === "adset" ? "adset_name" : "ad_name";

  const rows = await metaInsights({
    token,
    objectId: accountId,
    fields: [nameField, idField, "reach", "spend", "impressions", "actions"],
    timeRange: range,
    breakdowns: "user_segment_key",
    level,
    limit: 500,
  });

  const buckets = new Map<string, { name: string; segments: Record<SegmentKey, SegmentBucket> }>();

  for (const row of rows) {
    const entityId = row[idField] as string;
    if (!buckets.has(entityId)) {
      const segments = {} as Record<SegmentKey, SegmentBucket>;
      for (const key of SEGMENT_ORDER) segments[key] = { reach: 0, spend: 0, purchases: 0 };
      buckets.set(entityId, { name: (row[nameField] as string) ?? entityId, segments });
    }
    const bucket = buckets.get(entityId)!;
    const segmentKey = normalizeSegmentKey(row.user_segment_key);
    bucket.segments[segmentKey].reach += num(row.reach);
    bucket.segments[segmentKey].spend += num(row.spend);
    bucket.segments[segmentKey].purchases += extractPurchases(row.actions as Array<Record<string, string>> | undefined);
  }

  const entities: EntitySegmentRow[] = Array.from(buckets.entries()).map(([id, bucket]) => {
    const totalReach = SEGMENT_ORDER.reduce((sum, k) => sum + bucket.segments[k].reach, 0);
    const totalSpend = SEGMENT_ORDER.reduce((sum, k) => sum + bucket.segments[k].spend, 0);
    const totalPurchases = SEGMENT_ORDER.reduce((sum, k) => sum + bucket.segments[k].purchases, 0);
    const prospecting = bucket.segments.prospecting;
    const engaged = bucket.segments.engaged;
    const existing = bucket.segments.existing;
    return {
      id,
      name: bucket.name,
      totalReach,
      totalSpend,
      totalPurchases,
      prospectingReach: prospecting.reach,
      prospectingReachPct: percent(prospecting.reach, totalReach),
      prospectingSpendPct: percent(prospecting.spend, totalSpend),
      prospectingCpmr: cpmr(prospecting.spend, prospecting.reach),
      prospectingPurchases: prospecting.purchases,
      prospectingPurchasePct: percent(prospecting.purchases, totalPurchases),
      prospectingCpa: cpp(prospecting.spend, prospecting.purchases),
      engagedReach: engaged.reach,
      engagedReachPct: percent(engaged.reach, totalReach),
      engagedSpend: engaged.spend,
      engagedCpmr: cpmr(engaged.spend, engaged.reach),
      engagedPurchases: engaged.purchases,
      existingReach: existing.reach,
      existingReachPct: percent(existing.reach, totalReach),
      existingSpend: existing.spend,
      existingPurchases: existing.purchases,
    };
  });

  // backward-compat aliases
  const ads = entities.map((e) => ({ ...e, adId: e.id, adName: e.name })) as AdSegmentRow[];

  return { level, entities, ads };
}
