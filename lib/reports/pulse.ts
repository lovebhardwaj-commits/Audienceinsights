import { metaInsights } from "@/lib/meta-api";
import { num, extractPurchases } from "@/lib/calculations";
import { monthLabel } from "@/lib/dates";
import type { DateRange } from "@/lib/types";

// Cheap account-level pulse for the Overview band (Part 6) — a single monthly-increment
// query returns every month's headline metrics for the sparklines + MoM deltas.

export interface PulseMonth {
  label: string;
  monthStart: string;
  reach: number;
  spend: number;
  frequency: number;
  purchases: number;
}

export interface PulseReport {
  months: PulseMonth[];
}

export async function getPulseReport(token: string, accountId: string, range: DateRange): Promise<PulseReport> {
  const rows = await metaInsights({
    token,
    objectId: accountId,
    fields: ["reach", "spend", "frequency", "actions"],
    timeRange: range,
    timeIncrement: "monthly",
  });

  const months: PulseMonth[] = rows
    .map((row) => ({
      monthStart: row.date_start as string,
      label: monthLabel(row.date_start as string),
      reach: num(row.reach),
      spend: num(row.spend),
      frequency: num(row.frequency),
      purchases: extractPurchases(row.actions as Array<Record<string, string>> | undefined),
    }))
    .sort((a, b) => a.monthStart.localeCompare(b.monthStart));

  return { months };
}
