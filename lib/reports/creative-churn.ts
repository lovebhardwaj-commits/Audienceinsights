import { metaGetAllPages, metaInsights } from "@/lib/meta-api";
import { num } from "@/lib/calculations";
import { monthLabel, startOfMonth } from "@/lib/dates";
import type { DateRange, MetaAd } from "@/lib/types";

/** Sentinel cohort key for ads launched before the report window. */
export const PRE_COHORT_KEY = "__pre__";

export interface CreativeChurnCohort {
  /** "2026-03" month key, or PRE_COHORT_KEY for the legacy bucket. */
  key: string;
  /** "Mar 2026", or "Pre-Feb 2026" for the legacy bucket. */
  label: string;
  adCount: number;
  totalSpend: number;
}

export interface CreativeChurnDayRow {
  date: string; // "2026-03-07"
  totalSpend: number;
  cohortSpend: Record<string, number>;
}

export interface CreativeChurnReport {
  cohorts: CreativeChurnCohort[];
  days: CreativeChurnDayRow[];
  totalSpend: number;
}

/**
 * Daily spend split by the month each ad first launched (cohort-stacked area data).
 * Ads created before the report window collapse into a single "Pre-{month}" bucket
 * so the chart's base layer is legacy creative spend, per the design spec.
 */
export async function getCreativeChurnReport(
  token: string,
  accountId: string,
  range: DateRange
): Promise<CreativeChurnReport> {
  const [ads, spendRows] = await Promise.all([
    // No status filter: an ad that spent money during `range` but has since been paused/archived
    // still needs its created_time mapped to a cohort, or its spend falls into "Unknown".
    metaGetAllPages(`/${accountId}/ads`, token, {
      fields: "id,name,created_time,status,campaign_id",
      limit: "200",
    }),
    metaInsights({
      token,
      objectId: accountId,
      fields: ["ad_id", "spend"],
      timeRange: range,
      level: "ad",
      timeIncrement: 1,
      limit: 500,
    }),
  ]);

  const windowStartMonth = startOfMonth(range.since); // "2026-02-01"
  const preLabel = `Pre-${monthLabel(windowStartMonth)}`;

  const cohortByAdId = new Map<string, string>();
  const cohortAdCount = new Map<string, number>();
  for (const ad of ads as MetaAd[]) {
    const launchMonth = startOfMonth(ad.created_time.slice(0, 10));
    const key = launchMonth < windowStartMonth ? PRE_COHORT_KEY : launchMonth.slice(0, 7);
    cohortByAdId.set(ad.id, key);
    cohortAdCount.set(key, (cohortAdCount.get(key) ?? 0) + 1);
  }

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

  // Only cohorts that actually spent in the window get a layer — stack order is
  // chronological with the legacy bucket at the bottom.
  const monthKeys = Array.from(cohortTotals.keys())
    .filter((k) => k !== PRE_COHORT_KEY && (cohortTotals.get(k) ?? 0) > 0)
    .sort();

  const cohorts: CreativeChurnCohort[] = [];
  if ((cohortTotals.get(PRE_COHORT_KEY) ?? 0) > 0) {
    cohorts.push({
      key: PRE_COHORT_KEY,
      label: preLabel,
      adCount: cohortAdCount.get(PRE_COHORT_KEY) ?? 0,
      totalSpend: cohortTotals.get(PRE_COHORT_KEY) ?? 0,
    });
  }
  for (const key of monthKeys) {
    cohorts.push({
      key,
      label: monthLabel(`${key}-01`),
      adCount: cohortAdCount.get(key) ?? 0,
      totalSpend: cohortTotals.get(key) ?? 0,
    });
  }

  const days: CreativeChurnDayRow[] = Array.from(dayBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      totalSpend: bucket.totalSpend,
      cohortSpend: Object.fromEntries(bucket.cohortSpend),
    }));

  return {
    cohorts,
    days,
    totalSpend: days.reduce((sum, d) => sum + d.totalSpend, 0),
  };
}
