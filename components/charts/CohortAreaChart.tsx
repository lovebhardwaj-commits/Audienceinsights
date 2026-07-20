"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_CHROME, CHART_INK } from "@/lib/chart-theme";
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
  /** Fires as the visible window changes — index range into `data`. */
  onRangeChange?: (startIndex: number, endIndex: number) => void;
}

const ACCENT = "#2563EB";
const HINT_KEY = "cohort-zoom-hint-seen";
const MIN_SPAN = 2; // smallest zoom window = 3 points

const tickStyle = { fontSize: 11, fill: CHART_INK.muted };

// Y-axis ticks drop trailing zero-fractions from the compact lakh/K notation
// (₹8.00L → ₹8L, ₹8.50L → ₹8.5L) without touching the shared formatter.
function formatAxisTick(v: number): string {
  return formatCurrencyCompact(v).replace(/(\.\d*?)0+(\D*)$/, (_, frac, suffix) => (frac === "." ? "" : frac) + suffix);
}

// Darken a #rrggbb hex by `amount` (0–1) — used for the 1px band border so
// neighboring cohort fills stay separable even when thin (fix #3).
function darken(hex: string, amount = 0.12): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const ch = (h: string) => Math.max(0, Math.round(parseInt(h, 16) * (1 - amount)));
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(ch(m[1]))}${to2(ch(m[2]))}${to2(ch(m[3]))}`;
}

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

type MiniDrag = "left" | "right" | "middle" | null;

export function CohortAreaChart({
  data,
  xKey,
  series,
  height = 420,
  onRangeChange,
}: CohortAreaChartProps) {
  const N = data.length;

  // ── Interpolation is mode-aware: daily = linear (honest spikes), weekly =
  //    monotone (smooth, overshoot-safe on a stacked area). Inferred from the
  //    gap between the first two raw dates — no new prop. ──────────────────────
  const curveType = useMemo<"linear" | "monotone">(() => {
    const a = data[0]?.__iso as string | undefined;
    const b = data[1]?.__iso as string | undefined;
    if (!a || !b) return "monotone";
    const gap = Math.round(
      (new Date(b.slice(0, 10) + "T00:00:00Z").getTime() -
        new Date(a.slice(0, 10) + "T00:00:00Z").getTime()) / 86400000
    );
    return gap <= 2 ? "linear" : "monotone";
  }, [data]);

  // ── Zoom window (indices into full `data`) ─────────────────────────────────
  const [win, setWin] = useState<[number, number]>([0, Math.max(0, N - 1)]);
  const [start, end] = win;
  const zoomed = start > 0 || end < N - 1;

  // Reset window whenever the dataset changes length (new fetch / granularity).
  useEffect(() => {
    setWin([0, Math.max(0, N - 1)]);
  }, [N]);

  // Notify the parent AFTER commit (never inside a setState updater / render) so
  // we don't trigger a "setState while rendering" warning. Ref keeps the inline
  // callback out of the dependency array.
  const onRangeChangeRef = useRef(onRangeChange);
  onRangeChangeRef.current = onRangeChange;
  useEffect(() => {
    onRangeChangeRef.current?.(start, end);
  }, [start, end]);

  const commitWin = useCallback(
    (lo: number, hi: number) => {
      const clampedLo = Math.max(0, Math.min(lo, N - 1 - MIN_SPAN));
      const clampedHi = Math.min(N - 1, Math.max(hi, clampedLo + MIN_SPAN));
      setWin([clampedLo, clampedHi]);
    },
    [N]
  );

  const resetZoom = useCallback(() => {
    setWin([0, Math.max(0, N - 1)]);
  }, [N]);

  const visibleData = useMemo(() => data.slice(start, end + 1), [data, start, end]);

  // ── Persistent click selection + hover highlight ───────────────────────────
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
  const highlight = hoveredSeries ?? activeSeries;
  const handleLegendClick = useCallback((key: string) => {
    setActiveSeries((prev) => (prev === key ? null : key));
  }, []);

  // ── Drag-to-select on the main plot ────────────────────────────────────────
  const [selLo, setSelLo] = useState<number | null>(null);
  const [selHi, setSelHi] = useState<number | null>(null);
  const draggingSel = selLo !== null;

  // Recharts types activeTooltipIndex loosely (number | string | null); coerce.
  const idxOf = (e: { activeTooltipIndex?: number | string | null } | null): number | null => {
    const raw = e?.activeTooltipIndex;
    const n = typeof raw === "string" ? Number(raw) : raw;
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  };
  const onPlotDown = useCallback((e: { activeTooltipIndex?: number | string | null } | null) => {
    const i = idxOf(e);
    if (i !== null) { setSelLo(i); setSelHi(i); }
  }, []);
  const onPlotMove = useCallback(
    (e: { activeTooltipIndex?: number | string | null } | null) => {
      const i = idxOf(e);
      if (draggingSel && i !== null) setSelHi(i);
    },
    [draggingSel]
  );
  const onPlotUp = useCallback(() => {
    if (selLo !== null && selHi !== null && selLo !== selHi) {
      const lo = Math.min(selLo, selHi);
      const hi = Math.max(selLo, selHi);
      commitWin(start + lo, start + hi);
    }
    setSelLo(null);
    setSelHi(null);
  }, [selLo, selHi, start, commitWin]);

  const plotRef = useRef<HTMLDivElement>(null);

  // ── Mini-map drag (handles + pan) ──────────────────────────────────────────
  const miniRef = useRef<HTMLDivElement>(null);
  const [miniDrag, setMiniDrag] = useState<MiniDrag>(null);
  const dragOrigin = useRef<{ px: number; start: number; end: number } | null>(null);

  const beginMiniDrag = useCallback(
    (mode: MiniDrag) => (ev: React.PointerEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      dragOrigin.current = { px: ev.clientX, start, end };
      setMiniDrag(mode);
      dismissHint();
    },
    [start, end]
  );

  useEffect(() => {
    if (!miniDrag) return;
    function idxAt(clientX: number): number {
      const rect = miniRef.current!.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(frac * (N - 1));
    }
    function onMove(ev: PointerEvent) {
      if (miniDrag === "left") {
        setWin(([, e]) => [Math.max(0, Math.min(idxAt(ev.clientX), e - MIN_SPAN)), e]);
      } else if (miniDrag === "right") {
        setWin(([s]) => [s, Math.min(N - 1, Math.max(idxAt(ev.clientX), s + MIN_SPAN))]);
      } else if (miniDrag === "middle" && dragOrigin.current) {
        const rect = miniRef.current!.getBoundingClientRect();
        const deltaIdx = Math.round(((ev.clientX - dragOrigin.current.px) / rect.width) * (N - 1));
        const span = dragOrigin.current.end - dragOrigin.current.start;
        let ns = dragOrigin.current.start + deltaIdx;
        ns = Math.max(0, Math.min(ns, N - 1 - span));
        setWin([ns, ns + span]);
      }
    }
    function onUp() {
      setMiniDrag(null);
      dragOrigin.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [miniDrag, N]);

  // ── One-time hint ──────────────────────────────────────────────────────────
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(HINT_KEY)) setShowHint(true);
    } catch { /* ignore */ }
  }, []);
  function dismissHint() {
    setShowHint(false);
    try { localStorage.setItem(HINT_KEY, "1"); } catch { /* ignore */ }
  }

  const selLeftPct = N > 1 ? (start / (N - 1)) * 100 : 0;
  const selWidthPct = N > 1 ? ((end - start) / (N - 1)) * 100 : 100;
  const canZoom = N > MIN_SPAN + 1;

  const zoomIn = useCallback(() => {
    setWin(([s, e]) => {
      const span = e - s;
      const mid = (s + e) / 2;
      const newSpan = Math.max(MIN_SPAN, Math.round(span * 0.6));
      let ns = Math.round(mid - newSpan / 2);
      ns = Math.max(0, Math.min(ns, N - 1 - newSpan));
      return [ns, ns + newSpan];
    });
  }, [N]);

  const zoomOut = useCallback(() => {
    setWin(([s, e]) => {
      const span = e - s;
      const mid = (s + e) / 2;
      const newSpan = Math.min(N - 1, Math.round(span * 1.6));
      let ns = Math.round(mid - newSpan / 2);
      ns = Math.max(0, Math.min(ns, N - 1 - newSpan));
      return [ns, ns + newSpan];
    });
  }, [N]);

  return (
    <div>
      {/* Main plot with zoom controls overlaid inside */}
      <div
        ref={plotRef}
        className="relative"
        style={{ width: "100%", height, cursor: draggingSel ? "ew-resize" : "crosshair" }}
      >
        {/* Zoom controls — inside the chart, top-right */}
        {canZoom && (
          <div className="absolute right-2 top-1 z-10 flex items-center gap-1">
            <button
              onClick={zoomIn}
              disabled={end - start <= MIN_SPAN}
              title="Zoom in"
              className="flex h-6 w-6 items-center justify-center rounded border border-slate-200/80 bg-white/90 text-[13px] font-bold text-slate-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-700 disabled:opacity-30"
            >+</button>
            <button
              onClick={zoomOut}
              disabled={!zoomed}
              title="Zoom out"
              className="flex h-6 w-6 items-center justify-center rounded border border-slate-200/80 bg-white/90 text-[13px] font-bold text-slate-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-700 disabled:opacity-30"
            >−</button>
            {zoomed && (
              <button
                onClick={resetZoom}
                className="ml-0.5 flex items-center gap-1 rounded-md border border-slate-200/80 bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-700"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" />
                </svg>
                Reset
              </button>
            )}
          </div>
        )}
        <ResponsiveContainer>
          <AreaChart
            data={visibleData}
            margin={{ top: 8, right: 20, left: 8, bottom: 4 }}
            onMouseDown={onPlotDown}
            onMouseMove={onPlotMove}
            onMouseUp={onPlotUp}
          >
            <defs>
              {series.map((s) => {
                const safeId = `cg-${s.key.replace(/[^a-zA-Z0-9]/g, "_")}`;
                return (
                  <linearGradient key={s.key} id={safeId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={s.color} stopOpacity={0.92} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0.7} />
                  </linearGradient>
                );
              })}
            </defs>

            <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />

            <XAxis dataKey={xKey} tick={tickStyle} axisLine={false} tickLine={false} minTickGap={52} />

            <YAxis
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
              width={72}
              tickFormatter={formatAxisTick}
            />

            <Tooltip
              content={<CohortTip data={data} xKey={xKey} />}
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
                  type={curveType}
                  dataKey={s.key}
                  name={s.label}
                  stackId="1"
                  stroke={darken(s.color)}
                  strokeWidth={emphasized ? 2.5 : 1}
                  fill={`url(#${safeId})`}
                  fillOpacity={dimmed ? 0.22 : 1}
                  strokeOpacity={dimmed ? 0.3 : 1}
                  isAnimationActive={false}
                  onMouseEnter={() => setHoveredSeries(s.key)}
                  onMouseLeave={() => setHoveredSeries(null)}
                />
              );
            })}

            {draggingSel && selLo !== null && selHi !== null && selLo !== selHi && (
              <ReferenceArea
                x1={String(visibleData[Math.min(selLo, selHi)]?.[xKey])}
                x2={String(visibleData[Math.max(selLo, selHi)]?.[xKey])}
                strokeOpacity={0}
                fill={ACCENT}
                fillOpacity={0.12}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Mini-map / brush ─────────────────────────────────────────────── */}
      {canZoom && (
        <div className="relative mt-2 select-none" style={{ paddingLeft: 8, paddingRight: 8 }}>
          {showHint && (
            <div className="pointer-events-none absolute -top-5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
              Drag the handles to zoom
            </div>
          )}
          {/* Handles are OUTSIDE the overflow-hidden minimap so they're never clipped */}
          <div className="relative">
            <div
              ref={miniRef}
              className="h-14 w-full overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/60"
            >
              {/* Faint full-range preview */}
              <div className="pointer-events-none absolute inset-0 opacity-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    {series.map((s) => (
                      <Area
                        key={s.key}
                        type={curveType}
                        dataKey={s.key}
                        stackId="1"
                        stroke="none"
                        fill={s.color}
                        fillOpacity={0.55}
                        isAnimationActive={false}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Dimmed regions outside the selection */}
              <div className="absolute inset-y-0 left-0 bg-white/60" style={{ width: `${selLeftPct}%` }} />
              <div className="absolute inset-y-0 right-0 bg-white/60" style={{ width: `${Math.max(0, 100 - selLeftPct - selWidthPct)}%` }} />

              {/* Selection window (draggable to pan) */}
              <div
                onPointerDown={beginMiniDrag("middle")}
                className="absolute inset-y-0 cursor-grab active:cursor-grabbing"
                style={{
                  left: `${selLeftPct}%`,
                  width: `${selWidthPct}%`,
                  boxShadow: `inset 0 0 0 1.5px ${ACCENT}`,
                  background: `${ACCENT}0d`,
                }}
              />
            </div>

            {/* Left handle — positioned relative to the minimap, outside overflow-hidden */}
            <div
              onPointerDown={beginMiniDrag("left")}
              className="absolute top-1/2 z-10 flex h-8 w-4 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full shadow-md"
              style={{ left: `${selLeftPct}%`, marginLeft: -8, background: ACCENT }}
            >
              <span className="h-3 w-px bg-white/80" />
            </div>
            {/* Right handle */}
            <div
              onPointerDown={beginMiniDrag("right")}
              className="absolute top-1/2 z-10 flex h-8 w-4 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full shadow-md"
              style={{ left: `${selLeftPct + selWidthPct}%`, marginLeft: -8, background: ACCENT }}
            >
              <span className="h-3 w-px bg-white/80" />
            </div>
          </div>
        </div>
      )}

      {/* Interactive legend — click for persistent highlight, hover for temporary. */}
      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1.5">
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

// Tooltip wrapper so the memoized factory can read the full dataset.
function CohortTip(props: { data: Array<Record<string, string | number>>; xKey: string; active?: boolean; label?: string | number; payload?: TooltipEntry[] }) {
  const Tip = useMemo(() => makeCohortTooltip(props.data, props.xKey), [props.data, props.xKey]);
  return <Tip active={props.active} label={props.label} payload={props.payload} />;
}
