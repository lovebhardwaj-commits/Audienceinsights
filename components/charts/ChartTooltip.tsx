"use client";

import { formatCompactNumber, formatPercent, formatCurrency, formatCurrencyCompact } from "@/lib/format";

export type ValueFormat = "number" | "compact" | "percent" | "currency" | "currencyCompact";

export function formatChartValue(value: number, fmt: ValueFormat): string {
  switch (fmt) {
    case "compact":
      return formatCompactNumber(value);
    case "percent":
      return formatPercent(value);
    case "currency":
      return formatCurrency(value);
    case "currencyCompact":
      return formatCurrencyCompact(value);
    default:
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
  }
}

export function compactTickFormatter(value: number): string {
  return formatCompactNumber(value);
}

export function percentTickFormatter(value: number): string {
  return `${Math.round(value)}%`;
}

export function currencyTickFormatter(value: number): string {
  return formatCurrencyCompact(value);
}

interface TooltipEntry {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
}

interface ChartTooltipContentProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipEntry[];
  /** Per-series value format, keyed by dataKey. Falls back to `defaultFormat`. */
  formats?: Record<string, ValueFormat>;
  defaultFormat?: ValueFormat;
  /** Add a "Total" row summing all series — for additive/stacked charts (§3.3). */
  showTotal?: boolean;
  /** Show each value's share of the row total beside it — stacked contexts (§3.3). */
  shareOfTotal?: boolean;
  /** Map a truncated axis label back to the full entity name (§3.3, entity charts). */
  fullLabels?: Record<string, string>;
}

/** The one tooltip every chart uses (§3.3): dark card, colored series dots, full-precision
 *  right-aligned mono values, optional share-of-total and a summed Total row. The period
 *  header carries the "(partial)" tag straight from the datum label when D6 applies. */
export function ChartTooltipContent({
  active,
  label,
  payload,
  formats,
  defaultFormat = "compact",
  showTotal = false,
  shareOfTotal = false,
  fullLabels,
}: ChartTooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;

  const numeric = payload.map((e) => Number(Array.isArray(e.value) ? e.value[0] : e.value ?? 0));
  const total = numeric.reduce((s, v) => s + v, 0);
  const headerRaw = fullLabels?.[String(label)] ?? String(label ?? "");
  const isPartial = headerRaw.includes("(partial)");
  const header = headerRaw.replace(" (partial)", "");
  // A Total only reads truthfully when every series shares one unit.
  const oneFormat = new Set(payload.map((e) => formats?.[String(e.dataKey)] ?? defaultFormat)).size === 1;
  const totalFmt = formats?.[String(payload[0]?.dataKey)] ?? defaultFormat;

  return (
    <div className="min-w-[200px] max-w-[320px] rounded-xl border border-white/10 bg-[#1E293B] px-3.5 py-2.5 shadow-2xl shadow-black/30">
      <div className="flex items-center gap-2 break-words text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <span className="min-w-0">{header}</span>
        {isPartial && (
          <span className="rounded bg-amber-400/20 px-1 py-0.5 text-[9px] font-bold tracking-normal text-amber-300 normal-case">partial</span>
        )}
      </div>
      <div className="mt-1.5 space-y-1">
        {payload.map((entry, i) => {
          const key = String(entry.dataKey ?? i);
          const fmt = formats?.[key] ?? defaultFormat;
          const raw = numeric[i];
          const share = shareOfTotal && total > 0 ? (raw / total) * 100 : null;
          return (
            <div key={key} className="flex items-center gap-2 text-[13px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: entry.color }} />
              <span className="text-slate-300">{entry.name}</span>
              <span className="ml-auto pl-4 font-semibold tabular-nums text-white">
                {formatChartValue(raw, fmt)}
                {share !== null && <span className="ml-1 font-normal text-[11px] text-slate-400">{share.toFixed(0)}%</span>}
              </span>
            </div>
          );
        })}
        {showTotal && oneFormat && payload.length > 1 && (
          <div className="mt-1 flex items-center gap-2 border-t border-white/10 pt-1 text-[13px]">
            <span className="h-2.5 w-2.5 shrink-0" />
            <span className="font-semibold text-slate-200">Total</span>
            <span className="ml-auto pl-4 font-bold tabular-nums text-white">{formatChartValue(total, totalFmt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
