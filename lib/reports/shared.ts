import { metaGetAllPages, metaInsights } from "@/lib/meta-api";
import { num, cpmr, percent } from "@/lib/calculations";
import type { ApiFiltering, DateRange } from "@/lib/types";

export interface CampaignListItem {
  id: string;
  name: string;
}

export async function fetchCampaignList(token: string, accountId: string): Promise<CampaignListItem[]> {
  const rows = await metaGetAllPages(`/${accountId}/campaigns`, token, { fields: "id,name", limit: "200" });
  return rows as CampaignListItem[];
}

export interface AccountTotals {
  reach: number;
  spend: number;
  impressions: number;
  frequency: number;
}

export async function fetchAccountTotals(
  token: string,
  objectId: string,
  range: DateRange,
  filtering?: ApiFiltering[]
): Promise<AccountTotals> {
  const rows = await metaInsights({
    token,
    objectId,
    fields: ["reach", "spend", "impressions", "frequency"],
    timeRange: range,
    filtering,
  });
  const row = rows[0] ?? {};
  return { reach: num(row.reach), spend: num(row.spend), impressions: num(row.impressions), frequency: num(row.frequency) };
}

export interface BreakdownRow {
  key: string;
  reach: number;
  spend: number;
  cpmr: number;
  reachPct: number;
}

/**
 * Meta rejects `breakdowns=user_segment_key,<other>` as an invalid combination (storage-tier
 * limitation, not documented ahead of time) — so segment-vs-dimension reports run this once per
 * dimension instead of a single combined query, and the caller reconciles the two independent views.
 */
export async function fetchSingleBreakdown(
  token: string,
  accountId: string,
  range: DateRange,
  breakdown: string
): Promise<BreakdownRow[]> {
  const rows = await metaInsights({
    token,
    objectId: accountId,
    fields: ["reach", "spend", "impressions"],
    timeRange: range,
    breakdowns: breakdown,
  });

  const buckets = new Map<string, { reach: number; spend: number }>();
  for (const row of rows) {
    const key = (row[breakdown] as string) ?? "unknown";
    if (!buckets.has(key)) buckets.set(key, { reach: 0, spend: 0 });
    const bucket = buckets.get(key)!;
    bucket.reach += num(row.reach);
    bucket.spend += num(row.spend);
  }

  const totalReach = Array.from(buckets.values()).reduce((sum, b) => sum + b.reach, 0);

  return Array.from(buckets.entries())
    .map(([key, b]) => ({
      key,
      reach: b.reach,
      spend: b.spend,
      cpmr: cpmr(b.spend, b.reach),
      reachPct: percent(b.reach, totalReach),
    }))
    .sort((a, b) => b.reach - a.reach);
}
