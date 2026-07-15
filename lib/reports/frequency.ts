import { metaInsights } from "@/lib/meta-api";
import { num } from "@/lib/calculations";
import type { DateRange } from "@/lib/types";

export interface FrequencyCampaign {
  id: string;
  name: string;
  totalReach: number;
}

export interface FrequencyReport {
  weeks: string[];
  campaigns: FrequencyCampaign[];
  /** matrix[campaignId][weekStart] = { frequency, reach } */
  matrix: Record<string, Record<string, { frequency: number; reach: number }>>;
}

export async function getFrequencyReport(
  token: string,
  accountId: string,
  range: DateRange
): Promise<FrequencyReport> {
  const rows = await metaInsights({
    token,
    objectId: accountId,
    fields: ["campaign_id", "campaign_name", "reach", "impressions", "frequency"],
    timeRange: range,
    level: "campaign",
    timeIncrement: 7,
    limit: 2000,
  });

  const weekSet = new Set<string>();
  const campaignMap = new Map<string, string>();
  const matrix: Record<string, Record<string, { frequency: number; reach: number }>> = {};
  const totalReachMap = new Map<string, number>();

  for (const row of rows) {
    const campaignId = row.campaign_id as string;
    const campaignName = (row.campaign_name as string) ?? campaignId;
    const weekStart = row.date_start as string;
    const frequency = num(row.frequency);
    const reach = num(row.reach);

    if (!campaignId || !weekStart) continue;

    weekSet.add(weekStart);
    campaignMap.set(campaignId, campaignName);
    totalReachMap.set(campaignId, (totalReachMap.get(campaignId) ?? 0) + reach);

    if (!matrix[campaignId]) matrix[campaignId] = {};
    matrix[campaignId][weekStart] = { frequency, reach };
  }

  const weeks = Array.from(weekSet).sort();

  const campaigns: FrequencyCampaign[] = Array.from(campaignMap.entries())
    .map(([id, name]) => ({ id, name, totalReach: totalReachMap.get(id) ?? 0 }))
    .sort((a, b) => b.totalReach - a.totalReach)
    .slice(0, 25);

  return { weeks, campaigns, matrix };
}
