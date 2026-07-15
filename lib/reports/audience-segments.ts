import { metaInsights } from "@/lib/meta-api";
import { num, cpmr, cpp, percent, extractPurchases } from "@/lib/calculations";
import { SEGMENT_ORDER, normalizeSegmentKey } from "@/lib/constants";
import type { DateRange, SegmentKey } from "@/lib/types";

interface SegmentStats {
  reach: number;
  spend: number;
  impressions: number;
  purchases: number;
  cpmr: number;
  cpa: number;
  spendPct: number;
  reachPct: number;
  purchasePct: number;
}

interface WeekRow {
  weekStart: string;
  weekEnd: string;
  totalReach: number;
  totalSpend: number;
  totalPurchases: number;
  segments: Record<SegmentKey, SegmentStats>;
}

export interface AudienceSegmentsReport {
  weeks: WeekRow[];
  totals: Record<SegmentKey, SegmentStats>;
  totalReach: number;
  totalSpend: number;
  totalPurchases: number;
}

function emptySegmentMap(): Record<SegmentKey, SegmentStats> {
  const map = {} as Record<SegmentKey, SegmentStats>;
  for (const key of SEGMENT_ORDER) {
    map[key] = { reach: 0, spend: 0, impressions: 0, purchases: 0, cpmr: 0, cpa: 0, spendPct: 0, reachPct: 0, purchasePct: 0 };
  }
  return map;
}

function finalizeSegments(segments: Record<SegmentKey, SegmentStats>) {
  const totalReach = SEGMENT_ORDER.reduce((sum, k) => sum + segments[k].reach, 0);
  const totalSpend = SEGMENT_ORDER.reduce((sum, k) => sum + segments[k].spend, 0);
  const totalPurchases = SEGMENT_ORDER.reduce((sum, k) => sum + segments[k].purchases, 0);
  for (const key of SEGMENT_ORDER) {
    const seg = segments[key];
    seg.cpmr = cpmr(seg.spend, seg.reach);
    seg.cpa = cpp(seg.spend, seg.purchases);
    seg.spendPct = percent(seg.spend, totalSpend);
    seg.reachPct = percent(seg.reach, totalReach);
    seg.purchasePct = percent(seg.purchases, totalPurchases);
  }
  return { totalReach, totalSpend, totalPurchases };
}

export async function getAudienceSegmentsReport(
  token: string,
  accountId: string,
  range: DateRange
): Promise<AudienceSegmentsReport> {
  const [weeklyRows, totalRows] = await Promise.all([
    metaInsights({
      token,
      objectId: accountId,
      fields: ["reach", "spend", "impressions", "actions"],
      timeRange: range,
      breakdowns: "user_segment_key",
      timeIncrement: 7,
    }),
    metaInsights({
      token,
      objectId: accountId,
      fields: ["reach", "spend", "impressions", "actions"],
      timeRange: range,
      breakdowns: "user_segment_key",
    }),
  ]);

  const weekBuckets = new Map<string, { weekStart: string; weekEnd: string; segments: Record<SegmentKey, SegmentStats> }>();

  for (const row of weeklyRows) {
    const key = `${row.date_start}_${row.date_stop}`;
    if (!weekBuckets.has(key)) {
      weekBuckets.set(key, {
        weekStart: row.date_start as string,
        weekEnd: row.date_stop as string,
        segments: emptySegmentMap(),
      });
    }
    const bucket = weekBuckets.get(key)!;
    const segmentKey = normalizeSegmentKey(row.user_segment_key);
    const segment = bucket.segments[segmentKey];
    segment.reach += num(row.reach);
    segment.spend += num(row.spend);
    segment.impressions += num(row.impressions);
    segment.purchases += extractPurchases(row.actions as Array<Record<string, string>> | undefined);
  }

  const weeks: WeekRow[] = Array.from(weekBuckets.values())
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .map((bucket) => {
      const { totalReach, totalSpend, totalPurchases } = finalizeSegments(bucket.segments);
      return { weekStart: bucket.weekStart, weekEnd: bucket.weekEnd, totalReach, totalSpend, totalPurchases, segments: bucket.segments };
    });

  const totals = emptySegmentMap();
  for (const row of totalRows) {
    const segmentKey = normalizeSegmentKey(row.user_segment_key);
    totals[segmentKey].reach += num(row.reach);
    totals[segmentKey].spend += num(row.spend);
    totals[segmentKey].impressions += num(row.impressions);
    totals[segmentKey].purchases += extractPurchases(row.actions as Array<Record<string, string>> | undefined);
  }
  const { totalReach, totalSpend, totalPurchases } = finalizeSegments(totals);

  return { weeks, totals, totalReach, totalSpend, totalPurchases };
}
