import { metaGetAllPages, metaInsights } from "@/lib/meta-api";
import { num } from "@/lib/calculations";
import { monthLabel, monthWindows, startOfMonth, weeklyAlignedWindows } from "@/lib/dates";
import type { DateRange, MetaAd } from "@/lib/types";
import type { ProgressEmit } from "@/lib/stream";

/** Sentinel cohort key for creatives launched before the report window. */
export const PRE_COHORT_KEY = "__pre__";

export type ChurnGranularity = "daily" | "weekly";

export interface CreativeChurnCohort {
  key: string;
  label: string;
  creativeCount: number;
  adCount: number;
  totalSpend: number;
}

export interface CreativeChurnDayRow {
  date: string;
  totalSpend: number;
  cohortSpend: Record<string, number>;
}

export interface CreativeSeriesItem {
  creativeId: string;
  creativeName: string;
  adCount: number;
  totalSpend: number;
  /** Period date string (ISO) → spend for that period. Absent key = no spend = chart gap. */
  spendByPeriod: Record<string, number>;
}

export interface CreativeChurnReport {
  cohorts: CreativeChurnCohort[];
  days: CreativeChurnDayRow[];
  totalSpend: number;
  granularity: ChurnGranularity;
  /** Top 50 creatives by spend, for the heatmap / treemap / compare chart. */
  creativeSeries: CreativeSeriesItem[];
}

export interface CreativeChurnOptions {
  granularity: ChurnGranularity;
}

/**
 * Spend split by the month each creative was first created (cohort-stacked area).
 * Groups by creative_id (not ad_id) so the same image/video reused across multiple
 * ads counts as one entity with its true creation date, not the clone date.
 */
export async function getCreativeChurnReport(
  token: string,
  accountId: string,
  range: DateRange,
  opts: CreativeChurnOptions,
  emit?: ProgressEmit
): Promise<CreativeChurnReport> {
  const windows = opts.granularity === "weekly"
    ? weeklyAlignedWindows(range.since, range.until, 4)
    : monthWindows(range.since, range.until);
  const totalSteps = windows.length + 1;

  emit?.({ current: 0, total: totalSteps, label: "Fetching your ad list…" });
  const ads = await metaGetAllPages(`/${accountId}/ads`, token, {
    fields: "id,name,created_time,status,campaign_id,creative{id,name,created_time}",
    limit: "200",
  });

  let chunksDone = 0;
  const rowsByWindow = await Promise.all(
    windows.map(async (w) => {
      const rows = await metaInsights({
        token,
        objectId: accountId,
        fields: ["ad_id", "spend"],
        timeRange: { since: w.monthStart, until: w.monthEnd },
        level: "ad",
        timeIncrement: opts.granularity === "daily" ? 1 : 7,
        limit: 500,
      });
      chunksDone += 1;
      emit?.({ current: chunksDone, total: totalSteps, label: "Fetching data from Meta…" });
      return rows;
    })
  );
  const spendRows = rowsByWindow.flat();
  emit?.({ current: totalSteps, total: totalSteps, label: "Grouping into launch cohorts…" });

  // ── Build ad → creative mapping ──────────────────────────────────────────
  const adToCreative = new Map<string, string>();
  const creativeInfo = new Map<string, {
    id: string;
    name: string;
    createdTime: string;
    adIds: string[];
  }>();

  for (const ad of ads as MetaAd[]) {
    const creativeId = ad.creative?.id ?? ad.id;
    const creativeName = ad.creative?.name ?? ad.name;
    const creativeCreatedTime = ad.creative?.created_time ?? ad.created_time;

    adToCreative.set(ad.id, creativeId);

    if (!creativeInfo.has(creativeId)) {
      creativeInfo.set(creativeId, {
        id: creativeId,
        name: creativeName,
        createdTime: creativeCreatedTime,
        adIds: [],
      });
    }
    creativeInfo.get(creativeId)!.adIds.push(ad.id);
  }

  // ── Assign cohorts by creative's created_time ────────────────────────────
  const windowStartMonth = startOfMonth(range.since);
  const preLabel = `Pre-${monthLabel(windowStartMonth)}`;

  const cohortByCreativeId = new Map<string, string>();
  const cohortCreativeCount = new Map<string, number>();
  const cohortAdCount = new Map<string, number>();

  for (const [creativeId, info] of creativeInfo) {
    const launchMonth = startOfMonth(info.createdTime.slice(0, 10));
    const key = launchMonth < windowStartMonth ? PRE_COHORT_KEY : launchMonth.slice(0, 7);
    cohortByCreativeId.set(creativeId, key);
    cohortCreativeCount.set(key, (cohortCreativeCount.get(key) ?? 0) + 1);
    cohortAdCount.set(key, (cohortAdCount.get(key) ?? 0) + info.adIds.length);
  }

  // ── Regroup daily spend by creative ──────────────────────────────────────
  const dayBuckets = new Map<string, { totalSpend: number; cohortSpend: Map<string, number> }>();
  const cohortTotals = new Map<string, number>();
  const creativeDailySpend = new Map<string, Map<string, number>>();
  const creativeTotals = new Map<string, number>();

  for (const row of spendRows) {
    const date = (row.date_start as string) ?? "";
    const adId = row.ad_id as string;
    if (!date || !adId) continue;

    const creativeId = adToCreative.get(adId) ?? adId;
    const spend = num(row.spend);

    // Cohort-level aggregation (for stacked area chart)
    if (!dayBuckets.has(date)) dayBuckets.set(date, { totalSpend: 0, cohortSpend: new Map() });
    const bucket = dayBuckets.get(date)!;
    const cohort = cohortByCreativeId.get(creativeId) ?? PRE_COHORT_KEY;
    bucket.cohortSpend.set(cohort, (bucket.cohortSpend.get(cohort) ?? 0) + spend);
    bucket.totalSpend += spend;
    cohortTotals.set(cohort, (cohortTotals.get(cohort) ?? 0) + spend);

    // Per-creative aggregation (for heatmap / treemap / compare)
    if (!creativeDailySpend.has(creativeId)) creativeDailySpend.set(creativeId, new Map());
    const dayMap = creativeDailySpend.get(creativeId)!;
    dayMap.set(date, (dayMap.get(date) ?? 0) + spend);
    creativeTotals.set(creativeId, (creativeTotals.get(creativeId) ?? 0) + spend);
  }

  // ── Build cohort list ────────────────────────────────────────────────────
  const monthCohorts = Array.from(cohortTotals.keys())
    .filter((k) => k !== PRE_COHORT_KEY && (cohortTotals.get(k) ?? 0) > 0)
    .sort();

  const cohorts: CreativeChurnCohort[] = [];
  if ((cohortTotals.get(PRE_COHORT_KEY) ?? 0) > 0) {
    cohorts.push({
      key: PRE_COHORT_KEY,
      label: preLabel,
      creativeCount: cohortCreativeCount.get(PRE_COHORT_KEY) ?? 0,
      adCount: cohortAdCount.get(PRE_COHORT_KEY) ?? 0,
      totalSpend: cohortTotals.get(PRE_COHORT_KEY) ?? 0,
    });
  }
  for (const key of monthCohorts) {
    cohorts.push({
      key,
      label: monthLabel(`${key}-01`),
      creativeCount: cohortCreativeCount.get(key) ?? 0,
      adCount: cohortAdCount.get(key) ?? 0,
      totalSpend: cohortTotals.get(key) ?? 0,
    });
  }

  // ── Build day rows ───────────────────────────────────────────────────────
  const days: CreativeChurnDayRow[] = Array.from(dayBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({ date, totalSpend: bucket.totalSpend, cohortSpend: Object.fromEntries(bucket.cohortSpend) }));

  // ── Build per-creative spend series (top 50 by total spend) ──────────────
  const creativeSeries: CreativeSeriesItem[] = [...creativeTotals.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50)
    .map(([creativeId, totalSpend]) => {
      const info = creativeInfo.get(creativeId);
      return {
        creativeId,
        creativeName: info?.name ?? creativeId,
        adCount: info?.adIds.length ?? 1,
        totalSpend,
        spendByPeriod: Object.fromEntries(creativeDailySpend.get(creativeId) ?? []),
      };
    });

  return { cohorts, days, totalSpend: days.reduce((sum, d) => sum + d.totalSpend, 0), granularity: opts.granularity, creativeSeries };
}
