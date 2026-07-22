import { metaGetAllPages, metaInsights } from "@/lib/meta-api";
import { num } from "@/lib/calculations";
import { monthLabel, monthWindows, startOfMonth, weeklyAlignedWindows } from "@/lib/dates";
import type { DateRange, MetaAd } from "@/lib/types";
import type { ProgressEmit } from "@/lib/stream";

/** Sentinel cohort key for ads launched before the report window. */
export const PRE_COHORT_KEY = "__pre__";

export type ChurnGranularity = "daily" | "weekly";

export interface CreativeChurnCohort {
  key: string;
  label: string;
  adCount: number;
  totalSpend: number;
}

export interface CreativeChurnDayRow {
  date: string;
  totalSpend: number;
  cohortSpend: Record<string, number>;
}

export interface CreativeAdSeries {
  adId: string;
  adName: string;
  totalSpend: number;
  /** Period date string (ISO) → spend for that period. Absent key = no spend = chart gap. */
  spendByPeriod: Record<string, number>;
}

export interface CreativeChurnReport {
  cohorts: CreativeChurnCohort[];
  days: CreativeChurnDayRow[];
  totalSpend: number;
  granularity: ChurnGranularity;
  /** Top 50 individual ads by spend, for the per-creative line chart. */
  adSeries: CreativeAdSeries[];
}

export interface CreativeChurnOptions {
  granularity: ChurnGranularity;
}

/**
 * Spend split by the month each ad first launched (cohort-stacked area data). Always
 * fetches weekly (time_increment=7) for the exact selected range — the request is
 * chunked (week-aligned for weekly, calendar-month for daily) so wide ranges still
 * return the full series instead of Meta silently truncating to the most recent
 * window. Runs as a streaming report so the client sees progress and the response
 * never hangs to Vercel's kill.
 */
export async function getCreativeChurnReport(
  token: string,
  accountId: string,
  range: DateRange,
  opts: CreativeChurnOptions,
  emit?: ProgressEmit
): Promise<CreativeChurnReport> {
  // Meta's Insights API does not reliably return the full time-series when a
  // single time_increment=1/7 request spans several months — it can silently
  // come back with only the most recent window. Chunk the request and
  // concatenate, so a 6-month range actually returns 6 months of rows.
  //
  // Weekly (time_increment=7) MUST be chunked on whole-week boundaries
  // (weeklyAlignedWindows), not calendar months (monthWindows) — a
  // calendar-month chunk restarts weekly bucketing at each month's 1st,
  // producing a short/partial week right before every month boundary, which
  // reads as a false periodic dip to near-zero in the stacked chart. Daily
  // (time_increment=1) has no such alignment issue since every bucket is
  // exactly one calendar day regardless of chunk boundaries, so it keeps the
  // simpler calendar-month chunking.
  const windows = opts.granularity === "weekly"
    ? weeklyAlignedWindows(range.since, range.until, 4)
    : monthWindows(range.since, range.until);
  const totalSteps = windows.length + 1;

  emit?.({ current: 0, total: totalSteps, label: "Fetching your ad list…" });
  const ads = await metaGetAllPages(`/${accountId}/ads`, token, {
    fields: "id,name,created_time,status,campaign_id",
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

  const windowStartMonth = startOfMonth(range.since);
  const preLabel = `Pre-${monthLabel(windowStartMonth)}`;

  const cohortByAdId = new Map<string, string>();
  const cohortAdCount = new Map<string, number>();
  for (const ad of ads as MetaAd[]) {
    const launchMonth = startOfMonth(ad.created_time.slice(0, 10));
    const key = launchMonth < windowStartMonth ? PRE_COHORT_KEY : launchMonth.slice(0, 7);
    cohortByAdId.set(ad.id, key);
    cohortAdCount.set(key, (cohortAdCount.get(key) ?? 0) + 1);
  }

  // Every launch-month cohort with spend gets its own entry — no top-N cap,
  // no folding into an "Other" bucket. A brand-new cohort naturally starts
  // with less accumulated spend than older ones; folding by spend or even by
  // recency-rank still hides cohorts, which is backwards for a report whose
  // whole point is showing whether new creatives are taking over from old ones.
  const dayBuckets = new Map<string, { totalSpend: number; cohortSpend: Map<string, number> }>();
  const cohortTotals = new Map<string, number>();

  for (const row of spendRows) {
    const date = (row.date_start as string) ?? "";
    if (!date) continue;
    if (!dayBuckets.has(date)) dayBuckets.set(date, { totalSpend: 0, cohortSpend: new Map() });
    const bucket = dayBuckets.get(date)!;
    const cohort = cohortByAdId.get(row.ad_id as string) ?? PRE_COHORT_KEY;
    const spend = num(row.spend);
    bucket.cohortSpend.set(cohort, (bucket.cohortSpend.get(cohort) ?? 0) + spend);
    bucket.totalSpend += spend;
    cohortTotals.set(cohort, (cohortTotals.get(cohort) ?? 0) + spend);
  }

  const monthCohorts = Array.from(cohortTotals.keys())
    .filter((k) => k !== PRE_COHORT_KEY && (cohortTotals.get(k) ?? 0) > 0)
    .sort(); // YYYY-MM ascending = oldest first

  const cohorts: CreativeChurnCohort[] = [];
  if ((cohortTotals.get(PRE_COHORT_KEY) ?? 0) > 0) {
    cohorts.push({ key: PRE_COHORT_KEY, label: preLabel, adCount: cohortAdCount.get(PRE_COHORT_KEY) ?? 0, totalSpend: cohortTotals.get(PRE_COHORT_KEY) ?? 0 });
  }
  for (const key of monthCohorts) {
    cohorts.push({ key, label: monthLabel(`${key}-01`), adCount: cohortAdCount.get(key) ?? 0, totalSpend: cohortTotals.get(key) ?? 0 });
  }

  const days: CreativeChurnDayRow[] = Array.from(dayBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({ date, totalSpend: bucket.totalSpend, cohortSpend: Object.fromEntries(bucket.cohortSpend) }));

  // Build per-ad spend series for the line chart (top 50 by total spend).
  const adNameById = new Map<string, string>();
  for (const ad of ads as MetaAd[]) adNameById.set(ad.id, ad.name);

  const adTotals = new Map<string, number>();
  const adPeriodSpend = new Map<string, Map<string, number>>();
  for (const row of spendRows) {
    const adId = row.ad_id as string;
    const date = row.date_start as string;
    const spend = num(row.spend);
    if (!adId || !date || spend <= 0) continue;
    adTotals.set(adId, (adTotals.get(adId) ?? 0) + spend);
    if (!adPeriodSpend.has(adId)) adPeriodSpend.set(adId, new Map());
    adPeriodSpend.get(adId)!.set(date, (adPeriodSpend.get(adId)!.get(date) ?? 0) + spend);
  }
  const adSeries: CreativeAdSeries[] = [...adTotals.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50)
    .map(([adId, totalSpend]) => ({
      adId,
      adName: adNameById.get(adId) ?? adId,
      totalSpend,
      spendByPeriod: Object.fromEntries(adPeriodSpend.get(adId) ?? []),
    }));

  return { cohorts, days, totalSpend: days.reduce((sum, d) => sum + d.totalSpend, 0), granularity: opts.granularity, adSeries };
}
