"use client";

import { Area, AreaChart, Bar, BarChart, Brush, CartesianGrid, Cell, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_CHROME, CHART_INK } from "@/lib/chart-theme";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { ChartTooltipContent, compactTickFormatter, currencyTickFormatter, percentTickFormatter, type ValueFormat } from "./ChartTooltip";
import type { SeriesConfig } from "./LineChart";

interface StackedBarProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: SeriesConfig[];
  variant?: "bar" | "area";
  height?: number;
  unit?: string;
  valueFormat?: ValueFormat;
  brush?: boolean;
  xTitle?: string;
  yTitle?: string;
  referenceLines?: Array<{ y: number; label?: string; color?: string }>;
  /** Index of a trailing partial datum — its bar renders faded (§3.4 / D6). */
  partialIndex?: number;
}

const tickStyle = { fontSize: 12, fill: CHART_INK.muted, fontFamily: "var(--font-mono)" };
const axisTitleStyle = { fontSize: 12, fontWeight: 600 };

export function StackedBar({
  data,
  xKey,
  series,
  variant = "bar",
  height = 360,
  unit = "",
  valueFormat,
  brush,
  xTitle,
  yTitle,
  referenceLines,
  partialIndex,
}: StackedBarProps) {
  const animate = !useReducedMotion();
  const isPercent = unit === "%";
  const fmt: ValueFormat = valueFormat ?? (isPercent ? "percent" : "compact");
  const yTickFormatter =
    fmt === "percent" ? percentTickFormatter : fmt === "currency" || fmt === "currencyCompact" ? currencyTickFormatter : compactTickFormatter;
  const showBrush = brush ?? data.length > 12;
  const titleColor = series[0]?.color ?? CHART_INK.secondary;
  const wrapH = showBrush ? height + 40 : height;
  // % stacks aren't summable to a meaningful total; raw stacks are.
  const tooltip = <ChartTooltipContent defaultFormat={fmt} showTotal={!isPercent} shareOfTotal />;
  const refs = referenceLines?.map((rl, i) => (
    <ReferenceLine
      key={i}
      y={rl.y}
      stroke={rl.color ?? "#94a3b8"}
      strokeDasharray="5 3"
      strokeWidth={1.5}
      label={rl.label ? { value: rl.label, position: "insideTopRight", fontSize: 11, fill: rl.color ?? "#94a3b8" } : undefined}
    />
  ));

  return (
    <div>
    <div style={{ width: "100%", height: wrapH }}>
      <ResponsiveContainer>
        {variant === "area" ? (
          <AreaChart data={data} margin={{ top: 16, right: 20, left: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />
            <XAxis dataKey={xKey} tick={tickStyle} axisLine={{ stroke: CHART_CHROME.axis }} tickLine={false} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={64} tickFormatter={yTickFormatter} domain={isPercent ? [0, 100] : undefined} />
            <Tooltip content={tooltip} wrapperStyle={{ zIndex: 9999 }} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />}
            {series.map((s) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stackId="1" stroke={s.color} fill={s.color} fillOpacity={0.75} isAnimationActive={animate} animationDuration={600} animationEasing="ease-out" />
            ))}
            {refs}
            {showBrush && <Brush dataKey={xKey} height={26} stroke="#2563EB" fill="#F8FAFC" travellerWidth={10} />}
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 16, right: 20, left: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />
            <XAxis dataKey={xKey} tick={tickStyle} axisLine={{ stroke: CHART_CHROME.axis }} tickLine={false} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={64} tickFormatter={yTickFormatter} domain={isPercent ? [0, 100] : undefined} />
            <Tooltip content={tooltip} wrapperStyle={{ zIndex: 9999 }} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />}
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} stackId="1" fill={s.color} stroke={CHART_CHROME.surface} strokeWidth={2} maxBarSize={48} isAnimationActive={animate} animationDuration={400} animationEasing="ease-out">
                {partialIndex !== undefined &&
                  data.map((_, i) => <Cell key={i} fillOpacity={i === partialIndex ? 0.4 : 1} />)}
              </Bar>
            ))}
            {refs}
            {showBrush && <Brush dataKey={xKey} height={26} stroke="#2563EB" fill="#F8FAFC" travellerWidth={10} />}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
    {xTitle && (
      <p style={{ fontSize: 12, fontWeight: 600, color: CHART_INK.muted, textAlign: "center", marginTop: 2 }}>
        {xTitle}
      </p>
    )}
    </div>
  );
}
