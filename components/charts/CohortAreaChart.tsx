"use client";

import { memo, useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_CHROME, CHART_INK } from "@/lib/chart-theme";
import { formatCurrencyCompact } from "@/lib/format";

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
const MIN_SPAN = 3;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const tickStyle = { fontSize: 11, fill: CHART_INK.muted };

// Y-axis ticks drop trailing zero-fractions from the compact lakh/K notation
// (₹8.00L → ₹8L, ₹8.50L → ₹8.5L) without touching the shared formatter.
function formatAxisTick(v: number): string {
  return formatCurrencyCompact(v).replace(/(\.\d*?)0+(\D*)$/, (_, frac, suffix) => (frac === "." ? "" : frac) + suffix);
}

// Rounds up to a "nice" 1/2/5×10^n step so the stacked total nearly fills the
// frame without dead headroom, regardless of currency magnitude.
function niceCeil(raw: number): number {
  if (raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const frac = raw / base;
  const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return niceFrac * base;
}

// Darken a #rrggbb hex by `amount` (0–1) — used for the hover/pin stroke so a
// hot band reads as "this one" without needing a second color in the palette.
function darken(hex: string, amount = 0.25): string {
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

function ChurnTooltip({
  active,
  label,
  payload,
  highlightKey,
}: {
  active?: boolean;
  label?: string | number;
  payload?: TooltipEntry[];
  highlightKey: string | null;
}) {
  if (!active || !payload || payload.length === 0) return null;

  // Reversed so the top-of-stack (newest) cohort reads first, matching how the
  // eye scans the chart from the top band down.
  const rows = [...payload].reverse().filter((p) => Number(Array.isArray(p.value) ? p.value[0] : p.value ?? 0) > 0);
  if (rows.length === 0) return null;

  const total = payload.reduce((s, p) => s + Number(Array.isArray(p.value) ? p.value[0] : p.value ?? 0), 0);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/95 px-3.5 py-3 text-xs shadow-lg shadow-slate-300/30 backdrop-blur">
      <div className="mb-1.5 text-[12px] font-bold text-slate-800">{label}</div>
      <div className="space-y-1">
        {rows.map((p) => {
          const raw = Number(Array.isArray(p.value) ? p.value[0] : p.value ?? 0);
          const key = String(p.dataKey ?? "");
          const hot = highlightKey !== null && key === highlightKey;
          return (
            <div
              key={key}
              className={`flex items-center justify-between gap-4 rounded px-1 py-0.5 ${hot ? "bg-slate-100" : ""}`}
            >
              <span className={`flex items-center gap-1.5 ${hot ? "font-semibold text-slate-800" : "text-slate-500"}`}>
                <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
                <span className="max-w-[140px] truncate">{p.name}</span>
              </span>
              <span className={`tabular-nums ${hot ? "font-semibold text-slate-800" : "font-medium text-slate-700"}`}>
                {formatCurrencyCompact(raw)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-4 border-t border-slate-100 px-1 pt-1.5">
        <span className="text-slate-500">Total</span>
        <span className="font-semibold tabular-nums text-slate-800">{formatCurrencyCompact(total)}</span>
      </div>
    </div>
  );
}

// Memoized mini-map preview — depends only on data/series, so it renders once
// and stays put while the brush window / zoom changes every frame.
const MiniPreview = memo(function MiniPreview({
  data,
  series,
  xKey,
}: {
  data: Array<Record<string, string | number>>;
  series: CohortSeries[];
  xKey: string;
}) {
  // Keyed on the exact cohort set/order — when it grows (e.g. widening the date
  // range adds new launch-month cohorts), React's keyed-list reconciliation can
  // leave a pre-existing <Area> pinned at its old DOM position instead of
  // moving it past newly-inserted siblings, silently breaking stack order for
  // an SVG paint order that has no z-index escape hatch. Forcing a remount
  // whenever the series composition changes sidesteps that entirely.
  const seriesKey = series.map((s) => s.key).join("|");
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart key={seriesKey} data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
        {series.map((s) => (
          <Area key={s.key} type="monotone" dataKey={s.key} stackId="1" stroke="none" fill={s.color} fillOpacity={0.7} isAnimationActive={false} />
        ))}
        <XAxis dataKey={xKey} hide />
      </AreaChart>
    </ResponsiveContainer>
  );
});

type DragMode = "left" | "right" | "pan" | null;

export function CohortAreaChart({
  data,
  xKey,
  series,
  height = 360,
  onRangeChange,
}: CohortAreaChartProps) {
  const n = data.length;

  // Straight linear segments, not smoothed — the week-over-week zigzag/spike
  // is the intended read (honest week-to-week swings), even at weekly cadence.
  const interpolation = "linear" as const;

  // ── Zoom window (indices into full `data`) — controlled [startIdx, endIdx] ──
  const [startIdx, setStartIdx] = useState(0);
  const [endIdx, setEndIdx] = useState(Math.max(0, n - 1));

  // Reset window whenever the dataset changes length (new fetch).
  useEffect(() => {
    setStartIdx(0);
    setEndIdx(Math.max(0, n - 1));
  }, [n]);

  // Clamp for RENDER, not just in the effect above — when a new (shorter)
  // dataset arrives, this render still runs with the old startIdx/endIdx
  // before the reset effect has a chance to fire, so anything indexing into
  // `data` this render must use these, not the raw state. When n === 0 (data
  // still loading), maxIdx is -1 and safeEnd stays -1 so index loops below
  // naturally run zero times instead of touching data[0] on an empty array.
  const maxIdx = n - 1;
  const safeStart = clamp(startIdx, 0, Math.max(0, maxIdx));
  const safeEnd = n === 0 ? -1 : clamp(endIdx, safeStart, maxIdx);

  const isZoomed = safeStart > 0 || safeEnd < maxIdx;
  const visible = useMemo(() => data.slice(safeStart, safeEnd + 1), [data, safeStart, safeEnd]);
  const canZoom = n > MIN_SPAN + 1;

  // Live mirror of the range for the (stable) wheel handler.
  const rangeRef = useRef({ start: safeStart, end: safeEnd });
  rangeRef.current = { start: safeStart, end: safeEnd };

  // Notify the parent AFTER commit (never inside a setState updater / render).
  const onRangeChangeRef = useRef(onRangeChange);
  onRangeChangeRef.current = onRangeChange;
  useEffect(() => {
    onRangeChangeRef.current?.(safeStart, safeEnd);
  }, [safeStart, safeEnd]);

  // Coalesce rapid zoom/pan updates into ONE render per animation frame —
  // otherwise every wheel tick / pointermove triggers a full chart re-render
  // and they pile up, making zoom/pan feel stuttery instead of smooth.
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<[number, number] | null>(null);
  const applyRange = useCallback((s: number, e: number) => {
    pendingRef.current = [s, e];
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pending = pendingRef.current;
      if (!pending) return;
      setStartIdx(pending[0]);
      setEndIdx(pending[1]);
    });
  }, []);
  useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  const reset = useCallback(() => {
    setStartIdx(0);
    setEndIdx(Math.max(0, n - 1));
  }, [n]);

  // ── Tight y-domain so the stack nearly fills the frame ─────────────────────
  const yMax = useMemo(() => {
    const max = Math.max(
      ...data.map((row) => series.reduce((s, ser) => s + (Number(row[ser.key]) || 0), 0)),
      1
    );
    return niceCeil(max * 1.03);
  }, [data, series]);

  // ── Cohort emphasis: hover a band to preview, click to pin ─────────────────
  // Driven by the CHART, not the legend — the legend is a passive reflector.
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const emphasized = hoverKey ?? focusKey;

  // ── One-time hint ──────────────────────────────────────────────────────────
  const [hintDismissed, setHintDismissed] = useState(true);
  useEffect(() => {
    try {
      if (!localStorage.getItem(HINT_KEY)) setHintDismissed(false);
    } catch { /* ignore */ }
  }, []);
  function dismissHint() {
    setHintDismissed(true);
    try { localStorage.setItem(HINT_KEY, "1"); } catch { /* ignore */ }
  }

  // ── Brush handle / pan dragging ─────────────────────────────────────────────
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: DragMode;
    trackLeft: number;
    trackWidth: number;
    startClientX: number;
    origStart: number;
    origEnd: number;
    n: number;
  } | null>(null);

  const onDragMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const idxAt = (clientX: number) => Math.round(((clientX - d.trackLeft) / d.trackWidth) * (d.n - 1));
    if (d.mode === "left") {
      applyRange(clamp(idxAt(e.clientX), 0, d.origEnd - MIN_SPAN), d.origEnd);
    } else if (d.mode === "right") {
      applyRange(d.origStart, clamp(idxAt(e.clientX), d.origStart + MIN_SPAN, d.n - 1));
    } else {
      const deltaIdx = Math.round(((e.clientX - d.startClientX) / d.trackWidth) * (d.n - 1));
      const span = d.origEnd - d.origStart;
      const ns = clamp(d.origStart + deltaIdx, 0, d.n - 1 - span);
      applyRange(ns, ns + span);
    }
  }, [applyRange]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", endDrag);
    document.body.style.userSelect = "";
  }, [onDragMove]);

  const beginDrag = useCallback(
    (mode: DragMode) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dismissHint();
      const rect = trackRef.current!.getBoundingClientRect();
      dragRef.current = {
        mode,
        trackLeft: rect.left,
        trackWidth: rect.width,
        startClientX: e.clientX,
        origStart: safeStart,
        origEnd: safeEnd,
        n,
      };
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onDragMove);
      window.addEventListener("pointerup", endDrag);
    },
    [safeStart, safeEnd, n, onDragMove, endDrag]
  );

  useEffect(() => () => endDrag(), [endDrag]);

  // ── Scroll / trackpad zoom, centred on the cursor ──────────────────────────
  const plotWrapRef = useRef<HTMLDivElement>(null);
  const hoverIdxRef = useRef<number | null>(null);

  useEffect(() => {
    const el = plotWrapRef.current;
    if (!el || !canZoom) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      dismissHint();
      const { start, end } = rangeRef.current;
      const span = end - start;
      const center = hoverIdxRef.current ?? Math.round((start + end) / 2);
      const ratio = span > 0 ? (center - start) / span : 0.5;
      const factor = e.deltaY > 0 ? 1.18 : 0.82; // out : in
      const newSpan = clamp(Math.round(span * factor), MIN_SPAN, n - 1);
      let ns = Math.round(center - ratio * newSpan);
      let ne = ns + newSpan;
      if (ns < 0) { ns = 0; ne = newSpan; }
      if (ne > n - 1) { ne = n - 1; ns = n - 1 - newSpan; }
      applyRange(ns, ne);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [n, canZoom, applyRange]);

  // ── Drag-select on the plot to zoom into a range ───────────────────────────
  const [selStart, setSelStart] = useState<number | null>(null); // absolute idx
  const [selEnd, setSelEnd] = useState<number | null>(null);

  const idxOf = (e: { activeTooltipIndex?: number | string | null } | null): number | null => {
    const raw = e?.activeTooltipIndex;
    const num = typeof raw === "string" ? Number(raw) : raw;
    return typeof num === "number" && Number.isFinite(num) ? num : null;
  };

  const onPlotDown = useCallback(
    (e: { activeTooltipIndex?: number | string | null } | null) => {
      const i = idxOf(e);
      if (i !== null) { setSelStart(safeStart + i); setSelEnd(null); }
    },
    [safeStart]
  );
  const onPlotMove = useCallback(
    (e: { activeTooltipIndex?: number | string | null } | null) => {
      const i = idxOf(e);
      if (i === null) return;
      hoverIdxRef.current = safeStart + i;
      setSelStart((s) => {
        if (s !== null) setSelEnd(safeStart + i);
        return s;
      });
    },
    [safeStart]
  );
  const onPlotUp = useCallback(() => {
    if (selStart !== null && selEnd !== null && Math.abs(selEnd - selStart) >= MIN_SPAN) {
      setStartIdx(Math.min(selStart, selEnd));
      setEndIdx(Math.max(selStart, selEnd));
      dismissHint();
    }
    setSelStart(null);
    setSelEnd(null);
  }, [selStart, selEnd]);

  const selLabels =
    selStart !== null && selEnd !== null
      ? [data[Math.min(selStart, selEnd)]?.[xKey], data[Math.max(selStart, selEnd)]?.[xKey]]
      : null;

  // ── Brush geometry ──────────────────────────────────────────────────────────
  const startPct = n > 1 ? (safeStart / (n - 1)) * 100 : 0;
  const endPct = n > 1 ? (safeEnd / (n - 1)) * 100 : 100;

  // Keyed on the exact cohort set/order — see the matching comment on
  // MiniPreview above. Without this, widening the date range (adding new
  // launch-month cohorts to an already-mounted chart) can leave a
  // pre-existing <Area> pinned at its old stack position instead of moving
  // to the end, silently corrupting the visual stack order.
  const seriesKey = series.map((s) => s.key).join("|");

  return (
    <div className="select-none">
      {/* Main plot — drag-select to zoom, scroll/pinch to zoom at cursor */}
      <div ref={plotWrapRef} className="relative" style={{ touchAction: "none" }}>
        {isZoomed && (
          <button
            onClick={reset}
            className="absolute right-2 top-1 z-10 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-slate-800"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
            </svg>
            Reset zoom
          </button>
        )}
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            key={seriesKey}
            data={visible}
            margin={{ top: 16, right: 12, left: 4, bottom: 0 }}
            onMouseDown={onPlotDown}
            onMouseMove={onPlotMove}
            onMouseUp={onPlotUp}
            onMouseLeave={() => { hoverIdxRef.current = null; setHoverKey(null); }}
          >
            <CartesianGrid stroke={CHART_CHROME.gridline} vertical={false} fill={CHART_CHROME.surface} fillOpacity={1} />

            <XAxis
              dataKey={xKey}
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
              minTickGap={52}
            />

            <YAxis
              domain={[0, yMax]}
              tickFormatter={formatAxisTick}
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
              width={54}
            />

            <Tooltip
              content={<ChurnTooltip highlightKey={emphasized} />}
              cursor={{ stroke: "#475569", strokeWidth: 1.5 }}
              isAnimationActive={false}
              wrapperStyle={{ outline: "none", zIndex: 20 }}
            />

            {series.map((s) => {
              const isDim = emphasized !== null && emphasized !== s.key;
              const isHot = emphasized === s.key;
              const stroke = darken(s.color);
              return (
                <Area
                  key={s.key}
                  type={interpolation}
                  dataKey={s.key}
                  name={s.label}
                  stackId="1"
                  stroke={isHot ? stroke : "none"}
                  strokeWidth={isHot ? 1 : 0}
                  fill={s.color}
                  fillOpacity={isDim ? 0.65 : 0.98}
                  isAnimationActive={false}
                  activeDot={{ r: 3, strokeWidth: 1.5, stroke: "#fff", fill: stroke }}
                  onMouseEnter={() => setHoverKey(s.key)}
                  onMouseMove={() => setHoverKey(s.key)}
                  onClick={() => setFocusKey((k) => (k === s.key ? null : s.key))}
                  style={{ cursor: "pointer" }}
                />
              );
            })}

            {selLabels && (
              <ReferenceArea x1={String(selLabels[0])} x2={String(selLabels[1])} fill={ACCENT} fillOpacity={0.12} stroke={ACCENT} strokeOpacity={0.4} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Mini-map / brush ─────────────────────────────────────────────── */}
      {canZoom && (
        <div className="mt-2 px-1">
          <div ref={trackRef} className="relative h-14 w-full rounded-lg bg-slate-50/70 ring-1 ring-slate-200/70">
            {/* Faint full-range preview — memoized, never re-renders during drag/zoom */}
            <div className="pointer-events-none absolute inset-0 opacity-60">
              <MiniPreview data={data} series={series} xKey={xKey} />
            </div>

            {/* Dim outside the selection */}
            <div className="absolute inset-y-0 left-0 rounded-l-lg bg-white/70" style={{ width: `${startPct}%` }} />
            <div className="absolute inset-y-0 right-0 rounded-r-lg bg-white/70" style={{ left: `${endPct}%` }} />

            {/* Selection window border */}
            <div
              className="absolute inset-y-0 border-y"
              style={{ left: `${startPct}%`, width: `${endPct - startPct}%`, borderColor: `${ACCENT}80` }}
            />

            {/* Pan region (middle) */}
            <div
              onPointerDown={beginDrag("pan")}
              className="absolute inset-y-0 cursor-grab active:cursor-grabbing"
              style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
            />

            {/* Left handle */}
            <div
              onPointerDown={beginDrag("left")}
              className="group absolute inset-y-0 z-10 flex w-3 -translate-x-1/2 cursor-ew-resize items-center justify-center"
              style={{ left: `${startPct}%` }}
            >
              <div className="h-full w-[3px] rounded-full shadow-sm transition group-hover:w-1" style={{ background: ACCENT }} />
              <div className="absolute h-5 w-2.5 rounded-md shadow transition" style={{ background: ACCENT }}>
                <div className="mx-auto mt-[7px] h-1.5 w-[3px] rounded-full bg-white/80" />
              </div>
            </div>

            {/* Right handle */}
            <div
              onPointerDown={beginDrag("right")}
              className="group absolute inset-y-0 z-10 flex w-3 -translate-x-1/2 cursor-ew-resize items-center justify-center"
              style={{ left: `${endPct}%` }}
            >
              <div className="h-full w-[3px] rounded-full shadow-sm transition group-hover:w-1" style={{ background: ACCENT }} />
              <div className="absolute h-5 w-2.5 rounded-md shadow transition" style={{ background: ACCENT }}>
                <div className="mx-auto mt-[7px] h-1.5 w-[3px] rounded-full bg-white/80" />
              </div>
            </div>

            {/* One-time hint */}
            {!hintDismissed && !isZoomed && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-white">
                  Drag handles to zoom · scroll to zoom · drag on chart to select
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Legend (passive: reflects chart-driven emphasis, doesn't drive it) ── */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {series.map((s) => {
          const dimmed = emphasized !== null && emphasized !== s.key;
          const active = focusKey === s.key;
          return (
            <span
              key={s.key}
              className={`flex items-center gap-1.5 text-xs transition ${active ? "font-semibold text-slate-700" : "text-slate-500"} ${dimmed ? "opacity-40" : "opacity-100"}`}
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color, outline: `1px solid ${darken(s.color)}` }} />
              {s.label}
            </span>
          );
        })}
        {focusKey && (
          <button
            onClick={() => setFocusKey(null)}
            className="ml-1 rounded-full px-2 py-1 text-xs font-medium hover:bg-blue-50"
            style={{ color: ACCENT }}
          >
            Clear focus
          </button>
        )}
      </div>
    </div>
  );
}
