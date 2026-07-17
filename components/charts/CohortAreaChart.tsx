"use client";

import { Area, AreaChart, Brush, CartesianGrid, Label, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_CHROME, CHART_INK } from "@/lib/chart-theme";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { formatCurrency, formatCurrencyCompact, getCurrencySymbol } from "@/lib/format";

export interface CohortSeries {
  key: string;
  label: string;
  color: string;
}

interface CohortAreaChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: CohortSeries[]; // stack order: first = bottom layer
  height?: number;
  /** Fires as the brush handles move — index range into `data`. */
  onRangeChange?: (startIndex: number, endIndex: number) => void;
}

const tickStyle = { fontSize: 11, fill: CHART_INK.muted };

interface TooltipEntry {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
}

/** White card, bold date header, one swatch+label+value row per non-negligible
 *  cohort, ordered to match the stack — plus a delta vs the previous day per cohort
 *  (§7.7: Ad Insights' best chart, beaten via tooltip deltas). */
function makeCohortTooltip(data: Array<Record<string, string | number>>, xKey: string) {
  return function CohortTooltip({ active, label, payload }: { active?: boolean; label?: string | number; payload?: TooltipEntry[] }) {
    if (!active || !payload || payload.length === 0) return null;
    const rows = payload.filter((e) => Number(Array.isArray(e.value) ? e.value[0] : e.value ?? 0) >= 1);
    if (rows.length === 0) return null;
    const idx = data.findIndex((d) => String(d[xKey]) === String(label));
    const prev = idx > 0 ? data[idx - 1] : undefined;
    return (
      <div className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-xl shadow-slate-300/40">
        <div className="text-[12px] font-bold text-slate-800">{label}</div>
        <div className="mt-1.5 space-y-1">
          {rows.map((entry, i) => {
            const raw = Number(Array.isArray(entry.value) ? entry.value[0] : entry.value ?? 0);
            const key = String(entry.dataKey ?? "");
            const prevVal = prev ? Number(prev[key] ?? 0) : undefined;
            const delta = prevVal !== undefined ? raw - prevVal : undefined;
            const up = delta !== undefined && delta > 0;
            return (
              <div key={key || i} className="flex items-center gap-2 text-[12px]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: entry.color }} />
                <span className="text-slate-500">{entry.name}</span>
                <span className="ml-auto pl-4 font-bold tabular-nums text-slate-800">{formatCurrency(Math.round(raw))}</span>
                {delta !== undefined && Math.abs(delta) >= 1 && (
                  <span className={`w-14 shrink-0 text-right text-[10px] tabular-nums ${up ? "text-emerald-600" : "text-red-500"}`}>
                    {up ? "▲" : "▼"} {getCurrencySymbol()}{formatCurrencyCompact(Math.abs(Math.round(delta))).replace(getCurrencySymbol(), "")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };
}

export function CohortAreaChart({ data, xKey, series, height = 360, onRangeChange }: CohortAreaChartProps) {
  // [PM ENHANCEMENT] — chart animations respect the OS reduced-motion setting
  const animate = !useReducedMotion();
  const CohortTip = makeCohortTooltip(data, xKey);
  return (
    <div style={{ width: "100%", height: height + 52 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 20 }}>
          <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />
          <XAxis dataKey={xKey} tick={tickStyle} axisLine={{ stroke: CHART_CHROME.axis }} tickLine={false} minTickGap={48}>
            <Label value="Day" position="insideBottom" offset={-12} style={{ fontSize: 12, fontWeight: 600, fill: CHART_INK.muted }} />
          </XAxis>
          <YAxis
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            width={68}
            tickFormatter={(v: number) => formatCurrencyCompact(v)}
          >
            <Label value="Spend (₹)" angle={-90} position="insideLeft" style={{ fontSize: 12, fontWeight: 600, fill: CHART_INK.muted, textAnchor: "middle" }} />
          </YAxis>
          <Tooltip content={<CohortTip />} />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stackId="1"
              stroke={s.color}
              strokeWidth={1.5}
              fill={s.color}
              fillOpacity={0.65}
              isAnimationActive={animate}
              animationDuration={600}
              animationEasing="ease-out"
            />
          ))}
          <Brush
            dataKey={xKey}
            height={40}
            stroke="#2563EB"
            fill="#F8FAFC"
            travellerWidth={10}
            onChange={(range) => {
              if (onRangeChange && range && range.startIndex !== undefined && range.endIndex !== undefined) {
                onRangeChange(range.startIndex, range.endIndex);
              }
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
