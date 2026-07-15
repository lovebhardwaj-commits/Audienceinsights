"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_CHROME, CHART_INK } from "@/lib/chart-theme";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { ChartTooltipContent, compactTickFormatter, type ValueFormat } from "./ChartTooltip";
import type { SeriesConfig } from "./LineChart";

interface HorizontalBarProps {
  data: Array<Record<string, string | number>>;
  categoryKey: string;
  series: SeriesConfig[];
  stacked?: boolean;
  height?: number;
  categoryColors?: Record<string, string>;
  valueFormat?: ValueFormat;
}

const tickStyle = { fontSize: 12, fill: CHART_INK.muted };

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export function HorizontalBar({ data, categoryKey, series, stacked = false, height, categoryColors, valueFormat = "compact" }: HorizontalBarProps) {
  // [PM ENHANCEMENT] — chart animations respect the OS reduced-motion setting
  const animate = !useReducedMotion();
  const barHeight = Math.max(320, data.length * 36);
  const h = height ?? barHeight;

  return (
    <div style={{ width: "100%", height: h }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke={CHART_CHROME.gridline} />
          <XAxis
            type="number"
            tick={tickStyle}
            axisLine={{ stroke: CHART_CHROME.axis }}
            tickLine={false}
            tickFormatter={compactTickFormatter}
          />
          <YAxis
            type="category"
            dataKey={categoryKey}
            width={180}
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => truncate(v, 28)}
          />
          <Tooltip content={<ChartTooltipContent defaultFormat={valueFormat} />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />}
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              stackId={stacked ? "1" : undefined}
              stroke={CHART_CHROME.surface}
              strokeWidth={stacked ? 2 : 0}
              radius={stacked ? 0 : [0, 4, 4, 0]}
              maxBarSize={28}
              isAnimationActive={animate}
              animationDuration={400}
              animationEasing="ease-out"
            >
              {categoryColors &&
                data.map((entry, i) => (
                  <Cell key={i} fill={categoryColors[String(entry[categoryKey])] ?? s.color} />
                ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
