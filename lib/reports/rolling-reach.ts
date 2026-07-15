import { cpmr, costPer1k, netNew, percent } from "@/lib/calculations";
import { monthWindows } from "@/lib/dates";
import { fetchAccountTotals } from "./shared";
import type { DateRange } from "@/lib/types";
import type { ProgressEmit } from "@/lib/stream";

export interface RollingReachMonthRow {
  label: string;
  monthStart: string;
  monthEnd: string;
  isolatedReach: number;
  frequency: number;
  cumulativeReach: number;
  netNewReach: number;
  netNewPct: number;
  spend: number;
  cpmr: number;
  costPer1kNetNew: number;
}

export interface RollingReachReport {
  months: RollingReachMonthRow[];
  totalRollingReach: number;
  totalSpend: number;
  latestNetNewPct: number;
}

export async function getRollingReachReport(
  token: string,
  accountId: string,
  range: DateRange,
  emit: ProgressEmit
): Promise<RollingReachReport> {
  const windows = monthWindows(range.since, range.until);
  const months: RollingReachMonthRow[] = [];
  let previousCumulativeReach = 0;

  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    emit({ current: i + 1, total: windows.length, label: `Fetching month ${i + 1} of ${windows.length}…` });

    const [isolated, cumulative] = await Promise.all([
      fetchAccountTotals(token, accountId, { since: w.monthStart, until: w.monthEnd }),
      fetchAccountTotals(token, accountId, { since: range.since, until: w.monthEnd }),
    ]);

    const monthNetNew = netNew(cumulative.reach, previousCumulativeReach);
    months.push({
      label: w.label,
      monthStart: w.monthStart,
      monthEnd: w.monthEnd,
      isolatedReach: isolated.reach,
      frequency: isolated.frequency,
      cumulativeReach: cumulative.reach,
      netNewReach: monthNetNew,
      netNewPct: percent(monthNetNew, isolated.reach),
      spend: isolated.spend,
      cpmr: cpmr(isolated.spend, isolated.reach),
      costPer1kNetNew: costPer1k(isolated.spend, monthNetNew),
    });
    previousCumulativeReach = cumulative.reach;
  }

  const last = months[months.length - 1];
  return {
    months,
    totalRollingReach: last?.cumulativeReach ?? 0,
    totalSpend: months.reduce((sum, m) => sum + m.spend, 0),
    latestNetNewPct: last?.netNewPct ?? 0,
  };
}
