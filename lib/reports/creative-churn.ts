import { metaGetAllPages, metaInsights } from "@/lib/meta-api";
import { num } from "@/lib/calculations";
import { monthLabel, startOfMonth } from "@/lib/dates";
import type { DateRange, MetaAd } from "@/lib/types";
import type { ProgressEmit } from "@/lib/stream";

/** Sentinel cohort key for ads launched before the report window. */
export const PRE_COHORT_KEY = "__pre__";
/** Sentinel cohort key for the folded "Other" bucket beyond the top-N. */
export const OTHER_COHORT_KEY = "__other__";

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
  /** Keep the top-N launch-month cohorts by spend; fold the rest into "Other" (7.7). */
  topN: number;
}

/**
 * Spend split by the month each ad first launched (cohort-stacked area data). Defaults to
 * weekly granularity so it survives long ranges without timing out (7.7); a daily toggle is
 * available for ≤2-month ranges. Runs as a streaming report so the client sees progress and
 * the response never hangs to Vercel's kill.
 */
export async function getCreativeChurnReport(
  token: string,
  accountId: string,
  range: DateRange,
  opts: CreativeChurnOptions,
  emit?: ProgressEmit
): Promise<CreativeChurnReport> {
  emit?.({ current: 0, total: 2, label: "Fetching your ad list…" });
  const ads = await metaGetAllPages(`/${accountId}/ads`, token, {
    fields: "id,name,created_time,status,campaign_id",
    limit: "200",
  });

  emit?.({ current: 1, total: 2, label: `Fetching ${opts.granularity} spend by ad…` });
  const spendRows = await metaInsights({
    token,
    objectId: accountId,
    fields: ["ad_id", "spend"],
    timeRange: range,
    level: "ad",
    timeIncrement: opts.granularity === "daily" ? 1 : 7,
    limit: 500,
  });
  emit?.({ current: 2, total: 2, label: "Grouping into launch cohorts…" });

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

  // First pass: raw cohort totals to decide the top-N.
  const rawTotals = new Map<string, number>();
  for (const row of spendRows) {
    const cohort = cohortByAdId.get(row.ad_id as string) ?? PRE_COHORT_KEY;
    rawTotals.set(cohort, (rawTotals.get(cohort) ?? 0) + num(row.spend));
  }

  // Keep the top-N month cohorts by spend; everything else folds into "Other".
  const monthCohorts = Array.from(rawTotals.keys())
    .filter((k) => k !== PRE_COHORT_KEY && (rawTotals.get(k) ?? 0) > 0)
    .sort((a, b) => (rawTotals.get(b) ?? 0) - (rawTotals.get(a) ?? 0));
  const kept = new Set(monthCohorts.slice(0, opts.topN));
  const displayKey = (cohort: string) => {
    if (cohort === PRE_COHORT_KEY) return PRE_COHORT_KEY;
    return kept.has(cohort) ? cohort : OTHER_COHORT_KEY;
  };

  const dayBuckets = new Map<string, { totalSpend: number; cohortSpend: Map<string, number> }>();
  const cohortTotals = new Map<string, number>();
  const cohortAdCountFolded = new Map<string, number>();
  for (const [key, count] of cohortAdCount) {
    const d = displayKey(key);
    cohortAdCountFolded.set(d, (cohortAdCountFolded.get(d) ?? 0) + count);
  }

  for (const row of spendRows) {
    const date = (row.date_start as string) ?? "";
    if (!date) continue;
    if (!dayBuckets.has(date)) dayBuckets.set(date, { totalSpend: 0, cohortSpend: new Map() });
    const bucket = dayBuckets.get(date)!;
    const cohort = displayKey(cohortByAdId.get(row.ad_id as string) ?? PRE_COHORT_KEY);
    const spend = num(row.spend);
    bucket.cohortSpend.set(cohort, (bucket.cohortSpend.get(cohort) ?? 0) + spend);
    bucket.totalSpend += spend;
    cohortTotals.set(cohort, (cohortTotals.get(cohort) ?? 0) + spend);
  }

  const cohorts: CreativeChurnCohort[] = [];
  if ((cohortTotals.get(PRE_COHORT_KEY) ?? 0) > 0) {
    cohorts.push({ key: PRE_COHORT_KEY, label: preLabel, adCount: cohortAdCountFolded.get(PRE_COHORT_KEY) ?? 0, totalSpend: cohortTotals.get(PRE_COHORT_KEY) ?? 0 });
  }
  for (const key of monthCohorts.filter((k) => kept.has(k)).sort()) {
    cohorts.push({ key, label: monthLabel(`${key}-01`), adCount: cohortAdCountFolded.get(key) ?? 0, totalSpend: cohortTotals.get(key) ?? 0 });
  }
  if ((cohortTotals.get(OTHER_COHORT_KEY) ?? 0) > 0) {
    const foldedCount = monthCohorts.length - kept.size;
    cohorts.push({ key: OTHER_COHORT_KEY, label: `Other (${foldedCount} month${foldedCount === 1 ? "" : "s"})`, adCount: cohortAdCountFolded.get(OTHER_COHORT_KEY) ?? 0, totalSpend: cohortTotals.get(OTHER_COHORT_KEY) ?? 0 });
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
