import { metaGet, metaInsights } from "@/lib/meta-api";
import { num, cpmr, cpp, percent, extractPurchases } from "@/lib/calculations";
import { fetchAccountTotals } from "./shared";
import { SEGMENT_ORDER, normalizeSegmentKey } from "@/lib/constants";
import type { DateRange, SegmentKey } from "@/lib/types";

// Meta's filtering value array has a practical limit — batch and merge beyond this.
const FILTER_BATCH_SIZE = 500;

interface SegmentBucket {
  reach: number;
  spend: number;
  purchases: number;
}

export interface GroupMetrics {
  adCount: number;
  reach: number;
  spend: number;
  impressions: number;
  purchases: number;
  segments: {
    prospecting: SegmentBucket;
    engaged: SegmentBucket;
    existing: SegmentBucket;
  };
  newReachPct: number;
  newPurchasePct: number;
  cpmr: number;
  cpa: number;
  newCpa: number;
  /** Account reach if this group's ads were excluded entirely. */
  accountReachWithoutGroup: number;
  /** People this group reaches that no other ad in the account touches. */
  incrementalReach: number;
  /** incrementalReach as a % of this group's own reach. */
  incrementalPct: number;
}

export interface WeeklyTrendRow {
  weekStart: string;
  weekEnd: string;
  partnershipNewPct: number;
  normalNewPct: number;
  partnershipNewPurchPct: number;
  normalNewPurchPct: number;
}

export interface CreatorRow {
  handle: string;
  adCount: number;
  adIds: string[];
  totalReach: number;
  newReachPct: number;
  totalSpend: number;
  totalPurchases: number;
  newPurchases: number;
  newPurchasePct: number;
  newCpa: number;
  cpmr: number;
}

export interface PartnershipAdRow {
  adId: string;
  adName: string;
  creatorHandle: string;
  reach: number;
  newReachPct: number;
  spend: number;
  purchases: number;
  newPurchases: number;
  newPurchasePct: number;
}

export interface PartnershipReport {
  partnership: GroupMetrics;
  normal: GroupMetrics;
  weeklyTrend: WeeklyTrendRow[];
  creators: CreatorRow[];
  partnershipAds: PartnershipAdRow[];
  totalAccountReach: number;
  /** People reached by BOTH partnership and normal ads. */
  overlapBetweenGroups: number;
  overlapBetweenGroupsPct: number;
}

interface AdCreative {
  id?: string;
  name?: string;
  actor_id?: string;
  instagram_user_id?: string;
  facebook_branded_content?: { sponsor_page_id?: string };
  instagram_branded_content?: Record<string, unknown>;
}

interface MetaAdWithCreative {
  id: string;
  name: string;
  adcreatives?: { data?: AdCreative[] };
}

interface ClassifiedAd {
  id: string;
  name: string;
  isPartnership: boolean;
  creatorHandle: string | null;
}

function classifyAd(ad: MetaAdWithCreative): ClassifiedAd {
  const creative = ad.adcreatives?.data?.[0];
  const isPartnership = !!(
    creative?.facebook_branded_content?.sponsor_page_id ||
    creative?.instagram_branded_content
  );
  // Creator handle from the ifs_{creator}_ife naming convention.
  // Normalise to lowercase so "Naveena" and "naveena" merge into one row.
  const match = ad.name?.match(/ifs_([^_]+)_ife/i);
  return {
    id: ad.id,
    name: ad.name ?? ad.id,
    isPartnership,
    creatorHandle: match ? match[1].toLowerCase().trim() : null,
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Fetch creative + name fields for a specific list of ad IDs, 50 per batch.
 * Uses the multi-ID root endpoint so we only pull ads active in the date range.
 */
async function fetchAdsByIds(token: string, adIds: string[]): Promise<MetaAdWithCreative[]> {
  if (adIds.length === 0) return [];
  const fields =
    "id,name,adcreatives{id,name,actor_id,instagram_user_id,facebook_branded_content,instagram_branded_content}";
  const results: MetaAdWithCreative[] = [];
  for (const batch of chunk(adIds, 50)) {
    const json = await metaGet("/", token, { ids: batch.join(","), fields });
    // Multi-ID response is an object keyed by ad ID, not an array
    results.push(...(Object.values(json) as MetaAdWithCreative[]));
  }
  return results;
}

/** Segment-broken-down insights for a set of ad ids, batched past Meta's filter-array limit. */
async function fetchSegmentInsights(
  token: string,
  accountId: string,
  range: DateRange,
  adIds: string[],
  extra: { timeIncrement?: number; level?: "ad"; extraFields?: string[] } = {}
): Promise<any[]> {
  if (adIds.length === 0) return [];
  const batches = chunk(adIds, FILTER_BATCH_SIZE);
  const results: any[] = [];
  for (const batch of batches) {
    const rows = await metaInsights({
      token,
      objectId: accountId,
      fields: [...(extra.extraFields ?? []), "reach", "spend", "impressions", "actions"],
      timeRange: range,
      breakdowns: "user_segment_key",
      filtering: [{ field: "ad.id", operator: "IN", value: batch }],
      timeIncrement: extra.timeIncrement,
      level: extra.level,
      limit: 500,
    });
    results.push(...rows);
  }
  return results;
}

function emptyBuckets(): Record<SegmentKey, SegmentBucket> {
  const map = {} as Record<SegmentKey, SegmentBucket>;
  for (const key of SEGMENT_ORDER) map[key] = { reach: 0, spend: 0, purchases: 0 };
  return map;
}

function buildGroupMetrics(rows: any[], adCount: number, accountReachWithoutGroup: number, totalAccountReach: number): GroupMetrics {
  const buckets = emptyBuckets();
  let impressions = 0;
  for (const row of rows) {
    const seg = buckets[normalizeSegmentKey(row.user_segment_key)];
    seg.reach += num(row.reach);
    seg.spend += num(row.spend);
    seg.purchases += extractPurchases(row.actions);
    impressions += num(row.impressions);
  }
  const reach = SEGMENT_ORDER.reduce((s, k) => s + buckets[k].reach, 0);
  const spend = SEGMENT_ORDER.reduce((s, k) => s + buckets[k].spend, 0);
  const purchases = SEGMENT_ORDER.reduce((s, k) => s + buckets[k].purchases, 0);
  // Clamp — floating reconciliation across separate Meta queries can nudge this ±a few people.
  const incrementalReach = Math.max(0, totalAccountReach - accountReachWithoutGroup);
  return {
    adCount,
    reach,
    spend,
    impressions,
    purchases,
    segments: {
      prospecting: buckets.prospecting,
      engaged: buckets.engaged,
      existing: buckets.existing,
    },
    newReachPct: percent(buckets.prospecting.reach, reach),
    newPurchasePct: percent(buckets.prospecting.purchases, purchases),
    cpmr: cpmr(spend, reach),
    cpa: cpp(spend, purchases),
    newCpa: cpp(buckets.prospecting.spend, buckets.prospecting.purchases),
    accountReachWithoutGroup,
    incrementalReach,
    incrementalPct: percent(incrementalReach, reach),
  };
}

/** Weekly rows → per-week { newReachPct, newPurchPct }, keyed by weekStart. */
function weeklyNewPcts(rows: any[]): Map<string, { weekEnd: string; newPct: number; newPurchPct: number }> {
  const weeks = new Map<string, { weekEnd: string; segments: Record<SegmentKey, SegmentBucket> }>();
  for (const row of rows) {
    const key = row.date_start as string;
    if (!key) continue;
    if (!weeks.has(key)) weeks.set(key, { weekEnd: row.date_stop as string, segments: emptyBuckets() });
    const seg = weeks.get(key)!.segments[normalizeSegmentKey(row.user_segment_key)];
    seg.reach += num(row.reach);
    seg.spend += num(row.spend);
    seg.purchases += extractPurchases(row.actions);
  }
  const out = new Map<string, { weekEnd: string; newPct: number; newPurchPct: number }>();
  for (const [weekStart, w] of weeks) {
    const totalReach = SEGMENT_ORDER.reduce((s, k) => s + w.segments[k].reach, 0);
    const totalPurch = SEGMENT_ORDER.reduce((s, k) => s + w.segments[k].purchases, 0);
    out.set(weekStart, {
      weekEnd: w.weekEnd,
      newPct: percent(w.segments.prospecting.reach, totalReach),
      newPurchPct: percent(w.segments.prospecting.purchases, totalPurch),
    });
  }
  return out;
}

export async function getPartnershipAdsReport(
  token: string,
  accountId: string,
  range: DateRange
): Promise<PartnershipReport> {
  // Step 1 — ads active in this date range only.
  // The /ads endpoint has no date filter so it returns every ad ever created;
  // instead we ask the insights API for ad IDs that actually delivered in the
  // period, then fetch creative fields only for those IDs.
  const activeAdRows = await metaInsights({
    token,
    objectId: accountId,
    fields: ["ad_id"],
    timeRange: range,
    level: "ad",
    limit: 2000,
  });
  const activeAdIds = [...new Set(activeAdRows.map((r) => r.ad_id as string).filter(Boolean))];
  const rawAds = await fetchAdsByIds(token, activeAdIds);

  // Step 2 — classify
  const classified = rawAds.map(classifyAd);
  const partnershipAdsList = classified.filter((a) => a.isPartnership);
  const normalAdsList = classified.filter((a) => !a.isPartnership);
  const partnershipIds = partnershipAdsList.map((a) => a.id);
  const normalIds = normalAdsList.map((a) => a.id);
  const handleByAdId = new Map(partnershipAdsList.map((a) => [a.id, a.creatorHandle ?? "Unknown"]));

  // Step 3 — aggregate + weekly + per-ad insight pulls + incremental-reach totals.
  // "Reach without group X" needs one NOT_IN query per group with the *full* id
  // list — unlike the IN-filter segment queries above, this can't be split into
  // batches and summed (excluding half a group in one call, the other half in a
  // second, then adding the two reach totals together double-counts the people
  // both calls saw). Meta's filter-array limit is a soft ceiling in practice, so
  // for accounts with an unusually large ad group this call is best-effort.
  const [pAgg, nAgg, pWeekly, nWeekly, perAd, totalAccount, reachWithoutPartnership, reachWithoutNormal] = await Promise.all([
    fetchSegmentInsights(token, accountId, range, partnershipIds),
    fetchSegmentInsights(token, accountId, range, normalIds),
    fetchSegmentInsights(token, accountId, range, partnershipIds, { timeIncrement: 7 }),
    fetchSegmentInsights(token, accountId, range, normalIds, { timeIncrement: 7 }),
    fetchSegmentInsights(token, accountId, range, partnershipIds, { level: "ad", extraFields: ["ad_id", "ad_name"] }),
    fetchAccountTotals(token, accountId, range),
    partnershipIds.length > 0
      ? fetchAccountTotals(token, accountId, range, [{ field: "ad.id", operator: "NOT_IN", value: partnershipIds }])
      : fetchAccountTotals(token, accountId, range),
    normalIds.length > 0
      ? fetchAccountTotals(token, accountId, range, [{ field: "ad.id", operator: "NOT_IN", value: normalIds }])
      : fetchAccountTotals(token, accountId, range),
  ]);

  const totalAccountReach = totalAccount.reach;
  const partnership = buildGroupMetrics(pAgg, partnershipAdsList.length, reachWithoutPartnership.reach, totalAccountReach);
  const normal = buildGroupMetrics(nAgg, normalAdsList.length, reachWithoutNormal.reach, totalAccountReach);

  const overlapBetweenGroups = Math.max(0, partnership.reach + normal.reach - totalAccountReach);
  const overlapBetweenGroupsPct = percent(overlapBetweenGroups, totalAccountReach);

  // Weekly trend — outer-join both groups' weeks
  const pWeeks = weeklyNewPcts(pWeekly);
  const nWeeks = weeklyNewPcts(nWeekly);
  const allWeekStarts = Array.from(new Set([...pWeeks.keys(), ...nWeeks.keys()])).sort();
  const weeklyTrend: WeeklyTrendRow[] = allWeekStarts.map((weekStart) => {
    const p = pWeeks.get(weekStart);
    const n = nWeeks.get(weekStart);
    return {
      weekStart,
      weekEnd: p?.weekEnd ?? n?.weekEnd ?? weekStart,
      partnershipNewPct: p?.newPct ?? 0,
      normalNewPct: n?.newPct ?? 0,
      partnershipNewPurchPct: p?.newPurchPct ?? 0,
      normalNewPurchPct: n?.newPurchPct ?? 0,
    };
  });

  // Steps 4–5 — per-ad rollup, then group by creator handle
  const adBuckets = new Map<string, { adName: string; segments: Record<SegmentKey, SegmentBucket> }>();
  for (const row of perAd) {
    const adId = row.ad_id as string;
    if (!adId) continue;
    if (!adBuckets.has(adId)) adBuckets.set(adId, { adName: (row.ad_name as string) ?? adId, segments: emptyBuckets() });
    const seg = adBuckets.get(adId)!.segments[normalizeSegmentKey(row.user_segment_key)];
    seg.reach += num(row.reach);
    seg.spend += num(row.spend);
    seg.purchases += extractPurchases(row.actions);
  }

  const partnershipAds: PartnershipAdRow[] = Array.from(adBuckets.entries()).map(([adId, b]) => {
    const reach = SEGMENT_ORDER.reduce((s, k) => s + b.segments[k].reach, 0);
    const spend = SEGMENT_ORDER.reduce((s, k) => s + b.segments[k].spend, 0);
    const purchases = SEGMENT_ORDER.reduce((s, k) => s + b.segments[k].purchases, 0);
    return {
      adId,
      adName: b.adName,
      creatorHandle: handleByAdId.get(adId) ?? "Unknown",
      reach,
      newReachPct: percent(b.segments.prospecting.reach, reach),
      spend,
      purchases,
      newPurchases: b.segments.prospecting.purchases,
      newPurchasePct: percent(b.segments.prospecting.purchases, purchases),
    };
  });

  const creatorMap = new Map<string, { adIds: string[]; segments: Record<SegmentKey, SegmentBucket> }>();
  for (const [adId, b] of adBuckets) {
    const handle = handleByAdId.get(adId) ?? "Unknown";
    if (!creatorMap.has(handle)) creatorMap.set(handle, { adIds: [], segments: emptyBuckets() });
    const creator = creatorMap.get(handle)!;
    creator.adIds.push(adId);
    for (const k of SEGMENT_ORDER) {
      creator.segments[k].reach += b.segments[k].reach;
      creator.segments[k].spend += b.segments[k].spend;
      creator.segments[k].purchases += b.segments[k].purchases;
    }
  }

  const creators: CreatorRow[] = Array.from(creatorMap.entries())
    .map(([handle, c]) => {
      const totalReach = SEGMENT_ORDER.reduce((s, k) => s + c.segments[k].reach, 0);
      const totalSpend = SEGMENT_ORDER.reduce((s, k) => s + c.segments[k].spend, 0);
      const totalPurchases = SEGMENT_ORDER.reduce((s, k) => s + c.segments[k].purchases, 0);
      return {
        handle,
        adCount: c.adIds.length,
        adIds: c.adIds,
        totalReach,
        newReachPct: percent(c.segments.prospecting.reach, totalReach),
        totalSpend,
        totalPurchases,
        newPurchases: c.segments.prospecting.purchases,
        newPurchasePct: percent(c.segments.prospecting.purchases, totalPurchases),
        newCpa: cpp(c.segments.prospecting.spend, c.segments.prospecting.purchases),
        cpmr: cpmr(totalSpend, totalReach),
      };
    })
    .sort((a, b) => b.newPurchasePct - a.newPurchasePct);

  return {
    partnership,
    normal,
    weeklyTrend,
    creators,
    partnershipAds,
    totalAccountReach,
    overlapBetweenGroups,
    overlapBetweenGroupsPct,
  };
}
