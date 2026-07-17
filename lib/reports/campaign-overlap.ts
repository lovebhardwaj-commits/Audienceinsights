import { metaInsights } from "@/lib/meta-api";
import { num, cpmr, overlapPercent, uniqueContribution } from "@/lib/calculations";
import { fetchAccountTotals } from "./shared";
import type { DateRange } from "@/lib/types";
import type { ProgressEmit, PartialEmit } from "@/lib/stream";

export type OverlapLevel = "campaign" | "adset" | "ad";

export interface OverlapEntityRow {
  id: string;
  name: string;
  reach: number;
  spend: number;
  cpmr: number;
  reachWithoutEntity: number;
  uniqueContribution: number;
  overlapPct: number;
}

export interface CampaignOverlapReport {
  level: OverlapLevel;
  totalAccountReach: number;
  totalSpend: number;
  entityCount: number;
  entities: OverlapEntityRow[];
}

export interface CampaignOverlapOptions {
  level: OverlapLevel;
  topN: number;
  minReach: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getCampaignOverlapReport(
  token: string,
  accountId: string,
  range: DateRange,
  opts: CampaignOverlapOptions,
  emit: ProgressEmit,
  emitPartial?: PartialEmit
): Promise<CampaignOverlapReport> {
  emit({ current: 0, total: 1, label: "Fetching total account reach…" });
  const total = await fetchAccountTotals(token, accountId, range);

  emit({ current: 0, total: 1, label: `Fetching ${opts.level} list…` });
  const idField = opts.level === "campaign" ? "campaign_id" : opts.level === "adset" ? "adset_id" : "ad_id";
  const nameField = opts.level === "campaign" ? "campaign_name" : opts.level === "adset" ? "adset_name" : "ad_name";
  const listRows = await metaInsights({
    token,
    objectId: accountId,
    fields: [nameField, idField, "reach", "spend", "impressions"],
    timeRange: range,
    level: opts.level,
    limit: 200,
  });

  const candidates = listRows
    .map((row) => ({
      id: row[idField] as string,
      name: (row[nameField] as string) ?? (row[idField] as string),
      reach: num(row.reach),
      spend: num(row.spend),
    }))
    .filter((c) => c.reach >= opts.minReach)
    .sort((a, b) => b.reach - a.reach)
    .slice(0, opts.topN);

  const filterField = opts.level === "campaign" ? "campaign.id" : opts.level === "adset" ? "adset.id" : "ad.id";
  const entities: OverlapEntityRow[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    emit({
      current: i + 1,
      total: candidates.length,
      label: `Processing ${opts.level} ${i + 1} of ${candidates.length}: ${candidate.name}`,
    });

    const withoutEntity = await fetchAccountTotals(token, accountId, range, [
      { field: filterField, operator: "NOT_IN", value: [candidate.id] },
    ]);
    const unique = uniqueContribution(total.reach, withoutEntity.reach);

    const entity: OverlapEntityRow = {
      id: candidate.id,
      name: candidate.name,
      reach: candidate.reach,
      spend: candidate.spend,
      cpmr: cpmr(candidate.spend, candidate.reach),
      reachWithoutEntity: withoutEntity.reach,
      uniqueContribution: unique,
      overlapPct: overlapPercent(candidate.reach, unique),
    };
    entities.push(entity);
    // Stream each entity the moment it resolves so the page renders its bar/row
    // immediately instead of waiting ~40s for the whole run (D2).
    emitPartial?.(entity);

    if (i < candidates.length - 1) await sleep(1200);
  }

  return {
    level: opts.level,
    totalAccountReach: total.reach,
    totalSpend: total.spend,
    entityCount: listRows.length,
    entities,
  };
}
