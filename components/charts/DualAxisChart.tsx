"use client";

import { Bar, Brush, CartesianGrid, Cell, ComposedChart, Label, Legend, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  barDomain?: [number | string, number | string];
  lineDomain?: [number | string, number | string];
  referenceLines?: Array<{ yAxisId: "left" | "right"; y: number; label?: string; color?: string }>;
  /** Axis titles with units (§3.1). Left/right titles auto color-key to their series. */
  xTitle?: string;
  yTitle?: string;
  yRightTitle?: string;
  /** Index of a trailing partial datum — its bar renders faded (§3.4 / D6). */
  partialIndex?: number;
  /** Brush/zoom slider; defaults to on when there are more than 12 points (§3.4). */
  brush?: boolean;
  /** Single auto-annotated point: {index, text} — a dot + short callout (§3.4). */
  annotation?: { index: number; text: string; yAxisId?: "left" | "right"; seriesKey: string } | null;
}

const tickStyle = { fontSize: 12, fill: CHART_INK.muted, fontFamily: "var(--font-mono)" };
const axisTitleStyle = { fontSize: 12, fontWeight: 600 };

function tickFormatterFor(fmt: ValueFormat): (v: number) => string {
  if (fmt === "percent") return percentTickFormatter;
  if (fmt === "currency" || fmt === "currencyCompact") return currencyTickFormatter;
  return compactTickFormatter;
}

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
  referenceLines,
  xTitle,
  yTitle,
  yRightTitle,
  partialIndex,
  brush,
  annotation,
}: DualAxisChartProps) {
  const animate = !useReducedMotion();
  const formats: Record<string, ValueFormat> = {};
  for (const b of bars) formats[b.key] = barFormat;
  for (const l of lines) formats[l.key] = lineFormat;
  const showBrush = brush ?? data.length > 12;
  const leftTitleColor = bars[0]?.color ?? CHART_INK.secondary;
  const rightTitleColor = lines[0]?.color ?? CHART_INK.secondary;

  return (
    <div style={{ width: "100%", height: showBrush ? height + 40 : height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 16, right: 12, left: 8, bottom: xTitle ? 20 : 4 }}>
          <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />
          <XAxis dataKey={xKey} tick={tickStyle} axisLine={{ stroke: CHART_CHROME.axis }} tickLine={false}>
            {xTitle && <Label value={xTitle} position="insideBottom" offset={-12} style={{ ...axisTitleStyle, fill: CHART_INK.muted }} />}
          </XAxis>
          <YAxis
            yAxisId="left"
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            width={64}
            tickFormatter={tickFormatterFor(barFormat)}
            domain={barDomain ?? (barFormat === "percent" ? [0, 100] : undefined)}
          >
            {yTitle && <Label value={yTitle} angle={-90} position="insideLeft" style={{ ...axisTitleStyle, fill: leftTitleColor, textAnchor: "middle" }} />}
          </YAxis>
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            width={56}
            tickFormatter={tickFormatterFor(lineFormat)}
            domain={lineDomain ?? (lineFormat === "percent" ? [0, 100] : undefined)}
          >
            {yRightTitle && <Label value={yRightTitle} angle={90} position="insideRight" style={{ ...axisTitleStyle, fill: rightTitleColor, textAnchor: "middle" }} />}
          </YAxis>
          <Tooltip content={<ChartTooltipContent formats={formats} showTotal shareOfTotal />} />
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
            >
              {partialIndex !== undefined &&
                data.map((_, i) => <Cell key={i} fillOpacity={i === partialIndex ? 0.4 : 1} strokeDasharray={i === partialIndex ? "3 2" : undefined} />)}
            </Bar>
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
          {referenceLines?.map((rl, i) => (
            <ReferenceLine
              key={i}
              yAxisId={rl.yAxisId}
              y={rl.y}
              stroke={rl.color ?? "#94a3b8"}
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={rl.label ? { value: rl.label, position: "insideTopRight", fontSize: 11, fill: rl.color ?? "#94a3b8" } : undefined}
            />
          ))}
          {annotation && data[annotation.index] && (
            <ReferenceDot
              yAxisId={annotation.yAxisId ?? "right"}
              x={String(data[annotation.index][xKey])}
              y={Number(data[annotation.index][annotation.seriesKey])}
              r={4}
              fill={CHART_INK.primary}
              stroke="#fff"
              strokeWidth={1.5}
              label={{ value: annotation.text, position: "top", fontSize: 11, fontWeight: 600, fill: CHART_INK.primary }}
            />
          )}
          {showBrush && <Brush dataKey={xKey} height={26} stroke="#2563EB" fill="#F8FAFC" travellerWidth={10} y={height - 4} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
