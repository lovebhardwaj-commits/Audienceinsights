import { metaInsights } from "@/lib/meta-api";
import { num, findAction, upliftRatio, percent } from "@/lib/calculations";
import { isPartialWeek } from "@/lib/dates";
import type { DateRange } from "@/lib/types";

export interface ConversionWindowWeekRow {
  weekStart: string;
  weekEnd: string;
  purchases1dc: number;
  purchases7dc: number;
  purchases28dc: number;
  /** 1-day VIEW-through purchases — a separate attribution model (no click required),
   *  not additive with the click windows above. */
  purchases1dv: number;
  spend: number;
  upliftRatio: number;
  sameDayPct: number;
  /** Trailing bucket that spans <7 days — excluded from insights/severity, dashed in charts (D6). */
  isPartial: boolean;
}

export interface ConversionWindowsReport {
  weeks: ConversionWindowWeekRow[];
  totalPurchases1dc: number;
  totalPurchases28dc: number;
  totalPurchases1dv: number;
  overallUpliftRatio: number;
}

export async function getConversionWindowsReport(
  token: string,
  accountId: string,
  range: DateRange
): Promise<ConversionWindowsReport> {
  const rows = await metaInsights({
    token,
    objectId: accountId,
    fields: ["actions", "spend", "impressions"],
    timeRange: range,
    actionAttributionWindows: ["1d_click", "7d_click", "28d_click", "1d_view"],
    timeIncrement: 7,
  });

  const weeks: ConversionWindowWeekRow[] = rows
    .map((row) => {
      const actions = row.actions as Array<Record<string, string>> | undefined;
      const purchases1dc = findAction(actions, "purchase", "1d_click");
      const purchases7dc = findAction(actions, "purchase", "7d_click");
      const purchases28dc = findAction(actions, "purchase", "28d_click");
      const purchases1dv = findAction(actions, "purchase", "1d_view");
      return {
        weekStart: row.date_start as string,
        weekEnd: row.date_stop as string,
        purchases1dc,
        purchases7dc,
        purchases28dc,
        purchases1dv,
        spend: num(row.spend),
        upliftRatio: upliftRatio(purchases1dc, purchases28dc),
        sameDayPct: percent(purchases1dc, purchases28dc),
        isPartial: isPartialWeek(row.date_start as string, row.date_stop as string),
      };
    })
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  const totalPurchases1dc = weeks.reduce((sum, w) => sum + w.purchases1dc, 0);
  const totalPurchases28dc = weeks.reduce((sum, w) => sum + w.purchases28dc, 0);
  const totalPurchases1dv = weeks.reduce((sum, w) => sum + w.purchases1dv, 0);

  return {
    weeks,
    totalPurchases1dc,
    totalPurchases28dc,
    totalPurchases1dv,
    overallUpliftRatio: upliftRatio(totalPurchases1dc, totalPurchases28dc),
  };
}
