import { metaInsights } from "@/lib/meta-api";
import { num } from "@/lib/calculations";
import type { DateRange } from "@/lib/types";

export type FrequencyLevel = "campaign" | "adset" | "ad";

export interface FrequencyEntity {
  id: string;
  name: string;
  totalReach: number;
}

/** @deprecated use FrequencyEntity */
export type FrequencyCampaign = FrequencyEntity;

export interface FrequencyReport {
  level: FrequencyLevel;
  weeks: string[];
  /** Top 25 entities by total reach, sorted descending. Field kept as `campaigns` for compat. */
  campaigns: FrequencyEntity[];
  /** matrix[entityId][weekStart] = { frequency, reach } */
  matrix: Record<string, Record<string, { frequency: number; reach: number }>>;
}

const LEVEL_FIELDS: Record<FrequencyLevel, { id: string; name: string }> = {
  campaign: { id: "campaign_id", name: "campaign_name" },
  adset:    { id: "adset_id",   name: "adset_name"   },
  ad:       { id: "ad_id",      name: "ad_name"      },
};

export async function getFrequencyReport(
  token: string,
  accountId: string,
  range: DateRange,
  level: FrequencyLevel = "campaign"
): Promise<FrequencyReport> {
  const { id: idField, name: nameField } = LEVEL_FIELDS[level];

  const rows = await metaInsights({
    token,
    objectId: accountId,
    fields: [idField, nameField, "reach", "impressions", "frequency"],
    timeRange: range,
    level,
    timeIncrement: 7,
    limit: 2000,
  });

  const weekSet = new Set<string>();
  const entityMap = new Map<string, string>();
  const matrix: Record<string, Record<string, { frequency: number; reach: number }>> = {};
  const totalReachMap = new Map<string, number>();

  for (const row of rows) {
    const entityId   = row[idField]   as string;
    const entityName = (row[nameField] as string) ?? entityId;
    const weekStart  = row.date_start  as string;
    const frequency  = num(row.frequency);
    const reach      = num(row.reach);

    if (!entityId || !weekStart) continue;

    weekSet.add(weekStart);
    entityMap.set(entityId, entityName);
    totalReachMap.set(entityId, (totalReachMap.get(entityId) ?? 0) + reach);

    if (!matrix[entityId]) matrix[entityId] = {};
    matrix[entityId][weekStart] = { frequency, reach };
  }

  const weeks = Array.from(weekSet).sort();

  const campaigns: FrequencyEntity[] = Array.from(entityMap.entries())
    .map(([id, name]) => ({ id, name, totalReach: totalReachMap.get(id) ?? 0 }))
    .sort((a, b) => b.totalReach - a.totalReach)
    .slice(0, 25);

  return { level, weeks, campaigns, matrix };
}
