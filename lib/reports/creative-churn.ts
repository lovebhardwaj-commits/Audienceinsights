import { metaGetAllPages, metaInsights } from "@/lib/meta-api";
import { num } from "@/lib/calculations";
import { monthLabel, monthWindows, startOfMonth, weeklyAlignedWindows } from "@/lib/dates";
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

  const chunkNoun = opts.granularity === "weekly" ? "batches" : "months";
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
      emit?.({ current: chunksDone, total: totalSteps, label: `Fetching ${opts.granularity} spend — ${chunksDone} of ${windows.length} ${chunkNoun}…` });
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
