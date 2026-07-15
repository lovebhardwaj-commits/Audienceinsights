"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_CHROME, CHART_INK } from "@/lib/chart-theme";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { ChartTooltipContent, compactTickFormatter, type ValueFormat } from "./ChartTooltip";

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
}

const tickStyle = { fontSize: 12, fill: CHART_INK.muted };

export function LineChart({ data, xKey, lines = [], bars = [], height = 360, valueFormat = "compact" }: LineChartProps) {
  // [PM ENHANCEMENT] — chart animations respect the OS reduced-motion setting
  const animate = !useReducedMotion();
  const seriesCount = lines.length + bars.length;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />
          <XAxis dataKey={xKey} tick={tickStyle} axisLine={{ stroke: CHART_CHROME.axis }} tickLine={false} />
          <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={56} tickFormatter={compactTickFormatter} />
          <Tooltip content={<ChartTooltipContent defaultFormat={valueFormat} />} />
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
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
