import { cpmr, costPer1k, netNew, percent } from "@/lib/calculations";
import { monthWindows, addDays } from "@/lib/dates";
import { fetchAccountTotals } from "./shared";
import type { DateRange } from "@/lib/types";
import type { ProgressEmit } from "@/lib/stream";

export interface NetNewReachMonthRow {
  label: string;
  monthStart: string;
  monthEnd: string;
  isolatedReach: number;
  frequency: number;
  windowReach: number;
  netNewReach: number;
  netNewPct: number;
  spend: number;
  cpmr: number;
  costPer1kNetNew: number;
}

export interface NetNewReachReport {
  months: NetNewReachMonthRow[];
  totalSpend: number;
  latestNetNewPct: number;
  lookbackDays: number;
}

export async function getNetNewReachReport(
  token: string,
  accountId: string,
  range: DateRange,
  lookbackDays: number,
  emit: ProgressEmit
): Promise<NetNewReachReport> {
  const windows = monthWindows(range.since, range.until);
  const months: NetNewReachMonthRow[] = [];

  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    emit({ current: i + 1, total: windows.length, label: `Fetching month ${i + 1} of ${windows.length}…` });

    // Both baseline and combined share the same window start, so their reach
    // difference is exactly "people reached this month who were NOT reached in
    // the prior lookback period" — always within [0, isolatedReach]. Comparing
    // two *sliding* windows instead (the old approach) can go negative when
    // people age out of the window, and the first month has no baseline at all.
    const windowStart = addDays(w.monthStart, -lookbackDays);
    const [isolated, baseline, combined] = await Promise.all([
      fetchAccountTotals(token, accountId, { since: w.monthStart, until: w.monthEnd }),
      fetchAccountTotals(token, accountId, { since: windowStart, until: addDays(w.monthStart, -1) }),
      fetchAccountTotals(token, accountId, { since: windowStart, until: w.monthEnd }),
    ]);

    const monthNetNew = Math.min(netNew(combined.reach, baseline.reach), isolated.reach);
    months.push({
      label: w.label,
      monthStart: w.monthStart,
      monthEnd: w.monthEnd,
      isolatedReach: isolated.reach,
      frequency: isolated.frequency,
      windowReach: combined.reach,
      netNewReach: monthNetNew,
      netNewPct: percent(monthNetNew, isolated.reach),
      spend: isolated.spend,
      cpmr: cpmr(isolated.spend, isolated.reach),
      costPer1kNetNew: costPer1k(isolated.spend, monthNetNew),
    });
  }

  return {
    months,
    totalSpend: months.reduce((sum, m) => sum + m.spend, 0),
    latestNetNewPct: months[months.length - 1]?.netNewPct ?? 0,
    lookbackDays,
  };
}
