"use client";

import { Area, AreaChart, Bar, BarChart, Brush, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_CHROME, CHART_INK } from "@/lib/chart-theme";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { ChartTooltipContent, compactTickFormatter, percentTickFormatter, type ValueFormat } from "./ChartTooltip";
import type { SeriesConfig } from "./LineChart";

interface StackedBarProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: SeriesConfig[];
  variant?: "bar" | "area";
  height?: number;
  unit?: string;
  valueFormat?: ValueFormat;
  /** Adds a draggable zoom/brush slider below the chart — useful for long time series. */
  brush?: boolean;
}

const tickStyle = { fontSize: 12, fill: CHART_INK.muted };

export function StackedBar({ data, xKey, series, variant = "bar", height = 360, unit = "", valueFormat, brush = false }: StackedBarProps) {
  // [PM ENHANCEMENT] — chart animations respect the OS reduced-motion setting
  const animate = !useReducedMotion();
  const isPercent = unit === "%";
  const fmt: ValueFormat = valueFormat ?? (isPercent ? "percent" : "compact");
  const yTickFormatter = isPercent ? percentTickFormatter : compactTickFormatter;

  return (
    <div style={{ width: "100%", height: brush ? height + 44 : height }}>
      <ResponsiveContainer>
        {variant === "area" ? (
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />
            <XAxis dataKey={xKey} tick={tickStyle} axisLine={{ stroke: CHART_CHROME.axis }} tickLine={false} />
            <YAxis
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={yTickFormatter}
              domain={isPercent ? [0, 100] : undefined}
            />
            <Tooltip content={<ChartTooltipContent defaultFormat={fmt} />} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />}
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stackId="1"
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.75}
                isAnimationActive={animate}
                animationDuration={600}
                animationEasing="ease-out"
              />
            ))}
            {brush && (
              <Brush dataKey={xKey} height={30} stroke="#2563EB" fill="#F8FAFC" travellerWidth={10} />
            )}
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />
            <XAxis dataKey={xKey} tick={tickStyle} axisLine={{ stroke: CHART_CHROME.axis }} tickLine={false} />
            <YAxis
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={yTickFormatter}
              domain={isPercent ? [0, 100] : undefined}
            />
            <Tooltip content={<ChartTooltipContent defaultFormat={fmt} />} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />}
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId="1"
                fill={s.color}
                stroke={CHART_CHROME.surface}
                strokeWidth={2}
                maxBarSize={48}
                isAnimationActive={animate}
                animationDuration={400}
                animationEasing="ease-out"
              />
            ))}
            {brush && (
              <Brush dataKey={xKey} height={30} stroke="#2563EB" fill="#F8FAFC" travellerWidth={10} />
            )}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
