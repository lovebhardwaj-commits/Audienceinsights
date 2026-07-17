"use client";

import { useState, useCallback, useMemo } from "react";
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

function makeCohortTooltip(data: Array<Record<string, string | number>>, xKey: string) {
  return function CohortTooltip({
    active,
    label,
    payload,
  }: {
    active?: boolean;
    label?: string | number;
    payload?: TooltipEntry[];
  }) {
    if (!active || !payload || payload.length === 0) return null;

    // Sort descending by value, drop negligible entries
    const rows = [...payload]
      .filter((e) => Number(Array.isArray(e.value) ? e.value[0] : e.value ?? 0) >= 1)
      .sort(
        (a, b) =>
          Number(Array.isArray(b.value) ? b.value[0] : b.value ?? 0) -
          Number(Array.isArray(a.value) ? a.value[0] : a.value ?? 0)
      );

    if (rows.length === 0) return null;

    const total = rows.reduce(
      (s, e) => s + Number(Array.isArray(e.value) ? e.value[0] : e.value ?? 0),
      0
    );

    // Look up the previous point for delta display
    const idx = data.findIndex((d) => String(d[xKey]) === String(label));
    const prev = idx > 0 ? data[idx - 1] : undefined;

    return (
      <div
        className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 shadow-lg shadow-slate-300/30"
        style={{ minWidth: 220, maxHeight: 300, overflowY: "auto" }}
      >
        <div className="mb-2 text-[12px] font-bold text-slate-800">{label}</div>
        <div className="space-y-1.5">
          {rows.map((entry, i) => {
            const raw = Number(Array.isArray(entry.value) ? entry.value[0] : entry.value ?? 0);
            const key = String(entry.dataKey ?? i);
            const prevVal = prev ? Number(prev[key] ?? 0) : undefined;
            const delta = prevVal !== undefined ? raw - prevVal : undefined;
            const up = delta !== undefined && delta > 0;
            const share = total > 0 ? (raw / total) * 100 : 0;
            return (
              <div key={key} className="flex items-center gap-2 text-[12px]">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: entry.color }}
                />
                <span className="min-w-0 flex-1 truncate text-slate-500">{entry.name}</span>
                <span className="pl-2 font-semibold tabular-nums text-slate-800">
                  {formatCurrency(Math.round(raw))}
                </span>
                <span className="w-7 shrink-0 text-right text-[10px] text-slate-400">
                  {share.toFixed(0)}%
                </span>
                {delta !== undefined && Math.abs(delta) >= 1 && (
                  <span
                    className={`w-12 shrink-0 text-right text-[10px] tabular-nums ${
                      up ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {up ? "▲" : "▼"} {formatCurrencyCompact(Math.abs(Math.round(delta)))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[12px]">
          <span className="font-semibold text-slate-500">Total</span>
          <span className="font-bold tabular-nums text-slate-900">
            {formatCurrency(Math.round(total))}
          </span>
        </div>
      </div>
    );
  };
}

export function CohortAreaChart({
  data,
  xKey,
  series,
  height = 420,
  onRangeChange,
}: CohortAreaChartProps) {
  const animate = !useReducedMotion();

  // Persistent click selection + temporary hover state for highlighting.
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);

  // Hover takes precedence over click selection for display; both dim other series.
  const highlight = hoveredSeries ?? activeSeries;

  const handleLegendClick = useCallback((key: string) => {
    setActiveSeries((prev) => (prev === key ? null : key));
  }, []);

  const CohortTip = useMemo(() => makeCohortTooltip(data, xKey), [data, xKey]);

  return (
    <div>
      {/* Chart area — height + 60 to give the Brush room without clipping */}
      <div style={{ width: "100%", height: height + 60 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 20, left: 8, bottom: 4 }}>
            <defs>
              {series.map((s) => {
                const safeId = `cg-${s.key.replace(/[^a-zA-Z0-9]/g, "_")}`;
                return (
                  <linearGradient key={s.key} id={safeId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={s.color} stopOpacity={0.72} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0.42} />
                  </linearGradient>
                );
              })}
            </defs>

            <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />

            <XAxis
              dataKey={xKey}
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
              minTickGap={52}
            />

            <YAxis
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
              width={72}
              tickFormatter={(v: number) => formatCurrencyCompact(v)}
            />

            <Tooltip
              content={<CohortTip />}
              wrapperStyle={{ zIndex: 9999 }}
              allowEscapeViewBox={{ x: false, y: false }}
            />

            {series.map((s) => {
              const dimmed = highlight !== null && highlight !== s.key;
              const emphasized = highlight === s.key;
              const safeId = `cg-${s.key.replace(/[^a-zA-Z0-9]/g, "_")}`;
              return (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stackId="1"
                  stroke={s.color}
                  strokeWidth={emphasized ? 2.5 : 1.5}
                  fill={`url(#${safeId})`}
                  fillOpacity={dimmed ? 0.22 : 1}
                  strokeOpacity={dimmed ? 0.22 : 1}
                  isAnimationActive={animate}
                  animationDuration={350}
                  animationEasing="ease-out"
                  onMouseEnter={() => setHoveredSeries(s.key)}
                  onMouseLeave={() => setHoveredSeries(null)}
                />
              );
            })}

            <Brush
              dataKey={xKey}
              height={40}
              stroke={CHART_CHROME.gridline}
              fill="#F8FAFC"
              travellerWidth={8}
              onChange={(range) => {
                if (
                  onRangeChange &&
                  range &&
                  range.startIndex !== undefined &&
                  range.endIndex !== undefined
                ) {
                  onRangeChange(range.startIndex, range.endIndex);
                }
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive legend — click for persistent highlight, hover for temporary. */}
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1.5">
        {series.map((s) => {
          const isSelected = activeSeries === s.key;
          const dimmed = activeSeries !== null && !isSelected && hoveredSeries !== s.key;
          return (
            <button
              key={s.key}
              onMouseEnter={() => setHoveredSeries(s.key)}
              onMouseLeave={() => setHoveredSeries(null)}
              onClick={() => handleLegendClick(s.key)}
              style={{
                opacity: dimmed ? 0.38 : 1,
                transition: "opacity 180ms ease",
                cursor: "pointer",
              }}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] transition-colors ${
                isSelected ? "bg-slate-100 text-slate-700 font-semibold" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  background: s.color,
                  boxShadow: isSelected ? `0 0 0 2px white, 0 0 0 3px ${s.color}` : "none",
                  transition: "box-shadow 180ms ease",
                }}
              />
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
