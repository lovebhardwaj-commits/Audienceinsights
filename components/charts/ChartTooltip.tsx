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
}

/** Styled replacement for the default Recharts tooltip: white card, colored
 *  series dots, right-aligned formatted values. */
export function ChartTooltipContent({ active, label, payload, formats, defaultFormat = "compact" }: ChartTooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="min-w-[190px] rounded-xl border border-white/10 bg-[#1E293B] px-3.5 py-2.5 shadow-2xl shadow-black/30">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1.5 space-y-1">
        {payload.map((entry, i) => {
          const key = String(entry.dataKey ?? i);
          const fmt = formats?.[key] ?? defaultFormat;
          const raw = Array.isArray(entry.value) ? entry.value[0] : entry.value;
          return (
            <div key={key} className="flex items-center gap-2 text-[13px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: entry.color }} />
              <span className="text-slate-300">{entry.name}</span>
              <span className="ml-auto pl-4 font-semibold tabular-nums text-white">
                {formatChartValue(Number(raw ?? 0), fmt)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
