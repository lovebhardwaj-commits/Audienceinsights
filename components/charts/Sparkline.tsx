"use client";

// Tiny axis-free trend line for KPI cards and the Overview pulse band (Part 2.4 / Part 6).
// Inline SVG — no ResponsiveContainer, no axes, no tooltip; just the shape of the series
// with an emphasized endpoint. Color carries metric identity or stays neutral.

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  /** Draw a soft area fill under the line. */
  fill?: boolean;
}

export function Sparkline({ data, color = "var(--ink-tertiary)", width = 120, height = 28, fill = true }: SparklineProps) {
  const points = data.filter((n) => Number.isFinite(n));
  if (points.length < 2) return <div style={{ height }} aria-hidden />;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = width / (points.length - 1);
  const pad = 2; // keep the stroke off the edges

  const coords = points.map((v, i) => {
    const x = i * stepX;
    const y = pad + (height - pad * 2) * (1 - (v - min) / span);
    return [x, y] as const;
  });

  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const [lastX, lastY] = coords[coords.length - 1];
  const gradId = `spark-${Math.round(coords[0][1])}-${points.length}-${Math.round(max)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden>
      {fill && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.16" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradId})`} />
        </>
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  );
}
