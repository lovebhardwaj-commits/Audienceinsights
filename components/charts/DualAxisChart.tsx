"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_CHROME, CHART_INK } from "@/lib/chart-theme";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import {
  ChartTooltipContent,
  compactTickFormatter,
  currencyTickFormatter,
  percentTickFormatter,
  type ValueFormat,
} from "./ChartTooltip";

export interface DualAxisSeries {
  key: string;
  label: string;
  color: string;
}

interface DualAxisChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  /** Stacked bars, plotted on the left axis. */
  bars: DualAxisSeries[];
  /** Lines plotted on the right axis. */
  lines: DualAxisSeries[];
  barFormat?: ValueFormat;
  lineFormat?: ValueFormat;
  height?: number;
  /** Override the left (bar) axis domain — e.g. [0, 100] for a % stacked chart. */
  barDomain?: [number | string, number | string];
  /** Override the right (line) axis domain — defaults to [0, 100] when lineFormat is "percent",
   *  but ratios like uplift % aren't bounded at 100, so pass e.g. [0, "auto"] to let it scale up. */
  lineDomain?: [number | string, number | string];
}

const tickStyle = { fontSize: 12, fill: CHART_INK.muted };

function tickFormatterFor(fmt: ValueFormat): (v: number) => string {
  if (fmt === "percent") return percentTickFormatter;
  if (fmt === "currency" || fmt === "currencyCompact") return currencyTickFormatter;
  return compactTickFormatter;
}

/** Stacked bars on the left axis with one or more overlay lines on an
 *  independent right axis — e.g. reach composition bars + "% net new" line. */
export function DualAxisChart({
  data,
  xKey,
  bars,
  lines,
  barFormat = "compact",
  lineFormat = "percent",
  height = 360,
  barDomain,
  lineDomain,
}: DualAxisChartProps) {
  // [PM ENHANCEMENT] — chart animations respect the OS reduced-motion setting
  const animate = !useReducedMotion();
  const formats: Record<string, ValueFormat> = {};
  for (const b of bars) formats[b.key] = barFormat;
  for (const l of lines) formats[l.key] = lineFormat;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />
          <XAxis dataKey={xKey} tick={tickStyle} axisLine={{ stroke: CHART_CHROME.axis }} tickLine={false} />
          <YAxis
            yAxisId="left"
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            width={56}
            tickFormatter={tickFormatterFor(barFormat)}
            domain={barDomain ?? (barFormat === "percent" ? [0, 100] : undefined)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={tickFormatterFor(lineFormat)}
            domain={lineDomain ?? (lineFormat === "percent" ? [0, 100] : undefined)}
          />
          <Tooltip content={<ChartTooltipContent formats={formats} />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
          {bars.map((s) => (
            <Bar
              key={s.key}
              yAxisId="left"
              dataKey={s.key}
              name={s.label}
              stackId="composition"
              fill={s.color}
              stroke={CHART_CHROME.surface}
              strokeWidth={1}
              maxBarSize={80}
              isAnimationActive={animate}
              animationDuration={400}
              animationEasing="ease-out"
            />
          ))}
          {lines.map((s) => (
            <Line
              key={s.key}
              yAxisId="right"
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 0, fill: s.color }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
              isAnimationActive={animate}
              animationDuration={600}
              animationEasing="ease-out"
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
