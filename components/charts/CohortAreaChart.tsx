"use client";

import { Area, AreaChart, Brush, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_CHROME, CHART_INK } from "@/lib/chart-theme";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";

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
 *  cohort, ordered to match the stack. */
function CohortTooltip({ active, label, payload }: { active?: boolean; label?: string | number; payload?: TooltipEntry[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const rows = payload.filter((e) => Number(Array.isArray(e.value) ? e.value[0] : e.value ?? 0) >= 1);
  if (rows.length === 0) return null;
  return (
    <div className="min-w-[200px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-xl shadow-slate-300/40">
      <div className="text-[12px] font-bold text-slate-800">{label}</div>
      <div className="mt-1.5 space-y-1">
        {rows.map((entry, i) => {
          const raw = Number(Array.isArray(entry.value) ? entry.value[0] : entry.value ?? 0);
          return (
            <div key={String(entry.dataKey ?? i)} className="flex items-center gap-2 text-[12px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: entry.color }} />
              <span className="text-slate-500">{entry.name}</span>
              {/* whole rupees — paise precision is noise on a spend-trend chart */}
              <span className="ml-auto pl-4 font-bold tabular-nums text-slate-800">{formatCurrency(Math.round(raw))}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CohortAreaChart({ data, xKey, series, height = 360, onRangeChange }: CohortAreaChartProps) {
  // [PM ENHANCEMENT] — chart animations respect the OS reduced-motion setting
  const animate = !useReducedMotion();
  return (
    <div style={{ width: "100%", height: height + 52 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />
          <XAxis dataKey={xKey} tick={tickStyle} axisLine={{ stroke: CHART_CHROME.axis }} tickLine={false} minTickGap={48} />
          <YAxis
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            width={62}
            tickFormatter={(v: number) => formatCurrencyCompact(v)}
          />
          <Tooltip content={<CohortTooltip />} />
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
