"use client";

import { Bar, Brush, CartesianGrid, ComposedChart, Label, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_CHROME, CHART_INK } from "@/lib/chart-theme";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { ChartTooltipContent, compactTickFormatter, currencyTickFormatter, percentTickFormatter, type ValueFormat } from "./ChartTooltip";

export interface SeriesConfig {
  key: string;
  label: string;
  color: string;
}

interface LineChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  lines?: SeriesConfig[];
  bars?: SeriesConfig[];
  height?: number;
  valueFormat?: ValueFormat;
  xTitle?: string;
  yTitle?: string;
  referenceLines?: Array<{ y: number; label?: string; color?: string }>;
  brush?: boolean;
}

const tickStyle = { fontSize: 12, fill: CHART_INK.muted, fontFamily: "var(--font-mono)" };
const axisTitleStyle = { fontSize: 12, fontWeight: 600 };

function tickFormatterFor(fmt: ValueFormat): (v: number) => string {
  if (fmt === "percent") return percentTickFormatter;
  if (fmt === "currency" || fmt === "currencyCompact") return currencyTickFormatter;
  return compactTickFormatter;
}

export function LineChart({ data, xKey, lines = [], bars = [], height = 360, valueFormat = "compact", xTitle, yTitle, referenceLines, brush }: LineChartProps) {
  const animate = !useReducedMotion();
  const seriesCount = lines.length + bars.length;
  const showBrush = brush ?? data.length > 12;
  const titleColor = (lines[0] ?? bars[0])?.color ?? CHART_INK.secondary;
  const bottomMargin = showBrush && xTitle ? 44 : xTitle ? 36 : 4;
  return (
    <div style={{ width: "100%", height: showBrush ? height + 40 : height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 16, right: 24, left: 8, bottom: bottomMargin }}>
          <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />
          <XAxis dataKey={xKey} tick={tickStyle} axisLine={{ stroke: CHART_CHROME.axis }} tickLine={false}>
            {xTitle && <Label value={xTitle} position="insideBottom" offset={-28} style={{ ...axisTitleStyle, fill: CHART_INK.muted }} />}
          </XAxis>
          <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={64} tickFormatter={tickFormatterFor(valueFormat)}>
            {yTitle && <Label value={yTitle} angle={-90} position="insideLeft" style={{ ...axisTitleStyle, fill: titleColor, textAnchor: "middle" }} />}
          </YAxis>
          <Tooltip content={<ChartTooltipContent defaultFormat={valueFormat} />} wrapperStyle={{ zIndex: 9999 }} />
          {seriesCount > 1 && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />}
          {bars.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={animate} animationDuration={400} animationEasing="ease-out" />
          ))}
          {lines.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              isAnimationActive={animate}
              animationDuration={600}
              animationEasing="ease-out"
            />
          ))}
          {referenceLines?.map((rl, i) => (
            <ReferenceLine
              key={i}
              y={rl.y}
              stroke={rl.color ?? "#94a3b8"}
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={rl.label ? { value: rl.label, position: "insideTopRight", fontSize: 11, fill: rl.color ?? "#94a3b8" } : undefined}
            />
          ))}
          {showBrush && <Brush dataKey={xKey} height={26} stroke="#2563EB" fill="#F8FAFC" travellerWidth={10} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
