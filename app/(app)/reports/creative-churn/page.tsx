"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip,
  Treemap, XAxis, YAxis,
} from "recharts";
import { useAccount } from "@/components/providers/AccountProvider";
import { useStreamingReport } from "@/lib/hooks/useStreamingReport";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { CohortAreaChart } from "@/components/charts/CohortAreaChart";
import { ReportSummary } from "@/components/ui/ReportSummary";
import { FetchingState } from "@/components/ui/FetchingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { FreshnessStamp } from "@/components/ui/FreshnessStamp";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";
import {
  formatCurrency, formatCurrencyCompact, formatNumber, formatPercent, formatShortDate,
} from "@/lib/format";
import { creativeChurnInsights } from "@/lib/insights";
import { GLOSSARY } from "@/lib/glossary";
import { useReportRange } from "@/lib/hooks/useReportRange";
import { lastNMonths } from "@/lib/dates";
import { evictCached } from "@/lib/report-cache";
import { CHART_CHROME, CHART_INK } from "@/lib/chart-theme";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import {
  PRE_COHORT_KEY,
  type CreativeChurnReport, type CreativeAdSeries,
} from "@/lib/reports/creative-churn";

// Creative Churn is always weekly now (time_increment=7) — daily (time_increment=1)
// multiplies row count ~7x per ad, which was pushing wide ranges into Meta's rate
// limit even with the chunked/parallel fetch. No Weekly/Daily toggle; always
// fetches the exact months the user selects, with no silent clamping — a long
// range simply takes longer / risks a Meta timeout, which the existing error
// banner + "Retry with 1 month" action already surface.
// ─── Cohort chart palette ──────────────────────────────────────────────────
// Toned-down/desaturated pastels (matches the reference implementation's
// palette) — enough hue separation to stay distinguishable band-to-band, but
// muted rather than saturated so the stack reads calm even when fully packed.
const PRE_COHORT_COLOR = "#C2C6CE";
// No top-N cap anymore — every launch month with spend gets its own cohort, so
// a 12-month range needs 12 distinct colors (+ Pre). Sized generously; beyond
// this it cycles (COHORT_PALETTE[i % length]) rather than repeating too soon.
const COHORT_PALETTE = [
  "#E0AAA2", // dusty rose
  "#87BEB8", // muted teal
  "#9AB3D8", // muted blue
  "#B7CBA0", // muted sage
  "#E4CC8C", // muted gold
  "#C0A6D0", // muted mauve
  "#D9A98C", // muted terracotta
  "#A8AFC0", // muted steel
  "#B4A0E0", // muted violet
  "#8FBF9E", // muted mint
  "#D9B3C4", // muted pink
  "#A3A98C", // muted olive
];

// ─── Heatmap & compare palette ────────────────────────────────────────────
const COMPARE_COLORS = ["#2563EB", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6"];
const HEATMAP_COLORS = ["#EFF6FF", "#DBEAFE", "#93C5FD", "#60A5FA", "#3B82F6", "#2563EB", "#1D4ED8"];
const HEATMAP_ZERO = "#F1F5F9";

// ─── Types ─────────────────────────────────────────────────────────────────
type AdStatus = "scaling" | "fading" | "steady" | "new" | "paused";
type HeatmapSort = "totalSpend" | "currentPeriod" | "biggestChange" | "status" | "nameAsc";

// ─── Helpers ──────────────────────────────────────────────────────────────
function truncateAdName(name: string, maxLen = 25): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 1) + "…";
}

function formatMonthYear(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-IN", {
    month: "short", year: "numeric", timeZone: "UTC",
  });
}

// Quantile color scale — divides non-zero values into equal-count buckets.
function makeQuantileScale(values: number[]) {
  const nonZero = [...values].filter((v) => v > 0).sort((a, b) => a - b);
  const n = HEATMAP_COLORS.length;
  return (value: number): string => {
    if (!value || value <= 0) return HEATMAP_ZERO;
    const rank = nonZero.findIndex((x) => x >= value);
    const pct = rank < 0 ? 1 : rank / Math.max(nonZero.length, 1);
    return HEATMAP_COLORS[Math.min(Math.floor(pct * n), n - 1)];
  };
}

// Classify an ad's trend from its weekly spend series.
function classifyAdStatus(ad: CreativeAdSeries, days: Array<{ date: string }>): AdStatus {
  const weekly = days.map((d) => ad.spendByPeriod[d.date] ?? 0);
  const hasSpendNow = (ad.spendByPeriod[days[days.length - 1]?.date] ?? 0) > 0;
  if (!hasSpendNow) return "paused";
  const nonZeroCount = weekly.filter((s) => s > 0).length;
  if (nonZeroCount < 2) return "new";
  const recent = weekly.slice(-3);
  const oldest = recent[0] ?? 0;
  const newest = recent[recent.length - 1] ?? 0;
  if (oldest === 0) return "new";
  const change = (newest - oldest) / oldest;
  if (change > 0.3) return "scaling";
  if (change < -0.4) return "fading";
  return "steady";
}

const STATUS_META: Record<AdStatus, { label: string; color: string; bg: string; dot: string }> = {
  scaling:  { label: "Scaling",  color: "#059669", bg: "#DCFCE7", dot: "#10B981" },
  fading:   { label: "Fading",   color: "#DC2626", bg: "#FEE2E2", dot: "#EF4444" },
  steady:   { label: "Steady",   color: "#2563EB", bg: "#DBEAFE", dot: "#3B82F6" },
  new:      { label: "New",      color: "#7C3AED", bg: "#EDE9FE", dot: "#8B5CF6" },
  paused:   { label: "Paused",   color: "#94A3B8", bg: "#F1F5F9", dot: "#CBD5E1" },
};

// ─── Cohort table types ───────────────────────────────────────────────────
interface CohortTableRow {
  key: string; label: string; adCount: number;
  totalSpend: number; spendSharePct: number; last7SharePct: number; activeDays: number;
}

// ─── Custom Treemap Cell ──────────────────────────────────────────────────
interface TreemapCellProps {
  x?: number; y?: number; width?: number; height?: number;
  name?: string; value?: number; status?: AdStatus;
  totalSpend?: number; prevSpend?: number;
}

function TreemapCell(props: TreemapCellProps) {
  const { x = 0, y = 0, width = 0, height = 0, name = "", value = 0, status = "steady", totalSpend = 0, prevSpend = 0 } = props;
  if (width < 4 || height < 4) return null;
  const s = STATUS_META[status];
  const changePct = prevSpend > 0 ? ((value - prevSpend) / prevSpend) * 100 : null;
  const pctOfTotal = totalSpend > 0 ? (value / totalSpend) * 100 : 0;
  const large = pctOfTotal >= 8;
  const medium = pctOfTotal >= 3 && !large;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={4} fill={s.bg} stroke="#fff" strokeWidth={2} />
      {(large || medium) && (
        <foreignObject x={x + 6} y={y + 6} width={width - 12} height={height - 12} style={{ overflow: "hidden" }}>
          <div style={{ fontFamily: "inherit" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: s.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {truncateAdName(name, large ? 28 : 18)}
            </div>
            <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{formatCurrencyCompact(value)}</div>
            {large && changePct !== null && (
              <div style={{ fontSize: 10, color: changePct >= 0 ? "#059669" : "#DC2626", marginTop: 1 }}>
                {changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct).toFixed(0)}%
              </div>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function CreativeChurnPage() {
  const { selectedAccountId } = useAccount();
  const [range, setRange] = useReportRange("creative-churn", 1);
  const [visibleRange, setVisibleRange] = useState<[number, number] | null>(null);
  const [howToOpen, setHowToOpen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const currentUrlRef = useRef<string | null>(null);
  const { loading, isInitialLoad, data, error, errorCode, progress, fetchedAt, run, cancel } = useStreamingReport<CreativeChurnReport>();

  function handleRefresh() {
    if (currentUrlRef.current) evictCached(currentUrlRef.current);
    setRetryKey((k) => k + 1);
  }

  useEffect(() => {
    if (!selectedAccountId || !range) return;
    setVisibleRange(null);
    const params = new URLSearchParams({
      accountId: selectedAccountId,
      since: range.since,
      until: range.until,
      granularity: "weekly",
    });
    const url = `/api/reports/creative-churn?${params}`;
    // D-cache (lib/report-cache.ts, no TTL, keyed by URL): on mount and on
    // range change we want the last-generated cached report to render
    // instantly, so we do NOT evict here — run(url) checks the cache itself
    // and only hits the network when there's no entry. The only path that
    // should force a fresh fetch is an explicit user "Refresh" click, which
    // is handled by handleRefresh() evicting currentUrlRef.current before
    // bumping retryKey to re-trigger this effect.
    currentUrlRef.current = url;
    run(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, range, retryKey]);

  // ── New visualization state ──
  const [heatmapSort, setHeatmapSort] = useState<HeatmapSort>("totalSpend");
  const [heatmapStatusFilter, setHeatmapStatusFilter] = useState<AdStatus | null>(null);
  const [selectedAdIds, setSelectedAdIds] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [hoveredAdId, setHoveredAdId] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);
  const heatmapRef = useRef<HTMLDivElement>(null);
  const animate = !useReducedMotion();

  const report = data ?? undefined;
  const insights = useMemo(() => (report ? creativeChurnInsights(report) : []), [report]);

  // ── Cohort chart ─────────────────────────────────────────────────────────
  // Guarantee stacking order: PRE (bottom) → months oldest→newest (top).
  // CohortAreaChart stacks series[0] at the bottom; newest cohort must be last.
  const chartSeries = useMemo(() => {
    if (!report) return [];
    const pre = report.cohorts.find((c) => c.key === PRE_COHORT_KEY);
    const months = report.cohorts
      .filter((c) => c.key !== PRE_COHORT_KEY)
      .sort((a, b) => a.key.localeCompare(b.key)); // YYYY-MM asc = oldest first
    const ordered = [...(pre ? [pre] : []), ...months];
    let colorIdx = 0;
    return ordered.map((c) => ({
      key: c.key,
      label: c.label,
      color: c.key === PRE_COHORT_KEY ? PRE_COHORT_COLOR : COHORT_PALETTE[colorIdx++ % COHORT_PALETTE.length],
    }));
  }, [report]);

  const chartData = useMemo(() => {
    if (!report) return [];
    return report.days.map((day) => {
      // __iso carries the raw date so the chart can infer daily-vs-weekly spacing
      // (drives linear-vs-smooth interpolation) without a new prop.
      const point: Record<string, string | number> = { date: formatShortDate(day.date), __iso: day.date };
      for (const s of chartSeries) point[s.key] = Math.round(day.cohortSpend[s.key] ?? 0);
      return point;
    });
  }, [report, chartSeries]);

  // ── Ad status map ────────────────────────────────────────────────────────
  const adStatusMap = useMemo(() => {
    if (!report?.adSeries?.length) return new Map<string, AdStatus>();
    const map = new Map<string, AdStatus>();
    for (const ad of report.adSeries) map.set(ad.adId, classifyAdStatus(ad, report.days));
    return map;
  }, [report]);

  // ── Summary bar (scaling/fading/steady spend + counts) ───────────────────
  const summaryBar = useMemo(() => {
    if (!report?.adSeries?.length) return null;
    const lastDay = report.days[report.days.length - 1];
    const currentTotal = lastDay?.totalSpend ?? 0;
    const groups = { scaling: { count: 0, spend: 0 }, fading: { count: 0, spend: 0 }, steady: { count: 0, spend: 0 } };
    for (const ad of report.adSeries) {
      const status = adStatusMap.get(ad.adId);
      if (status !== "scaling" && status !== "fading" && status !== "steady") continue;
      const periodSpend = lastDay ? (ad.spendByPeriod[lastDay.date] ?? 0) : 0;
      groups[status].count++;
      groups[status].spend += periodSpend;
    }
    return { groups, currentTotal };
  }, [report, adStatusMap]);

  // ── Heatmap data ─────────────────────────────────────────────────────────
  const { sortedAds, colorScale, allSpendValues, quantileLegend } = useMemo(() => {
    const ads = report?.adSeries ?? [];
    const days = report?.days ?? [];
    const allSpendValues = ads.flatMap((a) => days.map((d) => a.spendByPeriod[d.date] ?? 0));
    const colorScale = makeQuantileScale(allSpendValues);

    const lastDay = days[days.length - 1];
    const prevDay = days[days.length - 2];

    let sorted = [...ads];
    if (heatmapStatusFilter) sorted = sorted.filter((a) => adStatusMap.get(a.adId) === heatmapStatusFilter);

    switch (heatmapSort) {
      case "currentPeriod":
        sorted.sort((a, b) => (b.spendByPeriod[lastDay?.date ?? ""] ?? 0) - (a.spendByPeriod[lastDay?.date ?? ""] ?? 0));
        break;
      case "biggestChange": {
        const change = (ad: CreativeAdSeries) => {
          const cur = lastDay ? (ad.spendByPeriod[lastDay.date] ?? 0) : 0;
          const prev = prevDay ? (ad.spendByPeriod[prevDay.date] ?? 0) : 0;
          return prev > 0 ? Math.abs((cur - prev) / prev) : 0;
        };
        sorted.sort((a, b) => change(b) - change(a));
        break;
      }
      case "status":
        sorted.sort((a, b) => {
          const order: AdStatus[] = ["scaling", "fading", "steady", "new", "paused"];
          return order.indexOf(adStatusMap.get(a.adId) ?? "paused") - order.indexOf(adStatusMap.get(b.adId) ?? "paused");
        });
        break;
      case "nameAsc":
        sorted.sort((a, b) => a.adName.localeCompare(b.adName));
        break;
      default:
        sorted.sort((a, b) => b.totalSpend - a.totalSpend);
    }

    // Legend: show 5 quantile breakpoints
    const nonZero = allSpendValues.filter((v) => v > 0).sort((a, b) => a - b);
    const breakpoints = [0, 0.25, 0.5, 0.75, 1].map((q) => {
      if (q === 0) return 0;
      const idx = Math.min(Math.floor(q * (nonZero.length - 1)), nonZero.length - 1);
      return nonZero[idx] ?? 0;
    });

    return { sortedAds: sorted, colorScale, allSpendValues, quantileLegend: breakpoints };
  }, [report, heatmapSort, heatmapStatusFilter, adStatusMap]);

  // ── Treemap data ─────────────────────────────────────────────────────────
  const treemapData = useMemo(() => {
    const ads = report?.adSeries ?? [];
    const days = report?.days ?? [];
    const lastDay = days[days.length - 1];
    const prevDay = days[days.length - 2];
    if (!lastDay) return [];

    const MIN_SPEND = 5000;
    const items = ads
      .map((ad) => ({
        name: ad.adName,
        adId: ad.adId,
        value: ad.spendByPeriod[lastDay.date] ?? 0,
        prevSpend: prevDay ? (ad.spendByPeriod[prevDay.date] ?? 0) : 0,
        totalSpend: ad.totalSpend,
        status: adStatusMap.get(ad.adId) ?? "paused" as AdStatus,
      }))
      .filter((d) => d.value > 0);

    const othersSpend = items.filter((d) => d.value < MIN_SPEND).reduce((s, d) => s + d.value, 0);
    const main = items.filter((d) => d.value >= MIN_SPEND);
    const total = items.reduce((s, d) => s + d.value, 0);
    const result = main.map((d) => ({ ...d, totalSpend: total }));
    if (othersSpend > 0) result.push({ name: `Others (${items.length - main.length})`, adId: "__others__", value: othersSpend, prevSpend: 0, totalSpend: total, status: "steady" as AdStatus });
    return result;
  }, [report, adStatusMap]);

  // ── Compare chart data ────────────────────────────────────────────────────
  const { compareData, compareAds } = useMemo(() => {
    const ads = (report?.adSeries ?? []).filter((a) => selectedAdIds.has(a.adId));
    const days = report?.days ?? [];
    const data = days.map((day) => {
      const point: Record<string, string | number | null> = { period: formatShortDate(day.date) };
      for (const ad of ads) {
        const s = ad.spendByPeriod[day.date];
        point[ad.adId] = s && s > 0 ? s : null;
      }
      return point;
    });
    return { compareData: data, compareAds: ads };
  }, [report, selectedAdIds]);

  // ── Visible range label ──────────────────────────────────────────────────
  const visibleRangeLabel = useMemo(() => {
    if (!report || report.days.length === 0) return "—";
    const [startIdx, endIdx] = visibleRange ?? [0, report.days.length - 1];
    const start = report.days[Math.max(0, Math.min(startIdx, report.days.length - 1))];
    const end = report.days[Math.max(0, Math.min(endIdx, report.days.length - 1))];
    return `${formatShortDate(start.date)} – ${formatShortDate(end.date)}`;
  }, [report, visibleRange]);

  // ── KPI cards ─────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!report) return null;
    const activeCreatives = report.adSeries.filter((a) => a.totalSpend > 0).length;
    const monthCohorts = report.cohorts.filter((c) => c.key !== PRE_COHORT_KEY);
    const newest = monthCohorts.sort((a, b) => b.key.localeCompare(a.key))[0];
    const newestShare = newest && report.totalSpend > 0 ? (newest.totalSpend / report.totalSpend) * 100 : 0;
    const preSpend = report.cohorts.find((c) => c.key === PRE_COHORT_KEY)?.totalSpend ?? 0;
    const oldestShare = report.totalSpend > 0 ? (preSpend / report.totalSpend) * 100 : 0;
    return { activeCreatives, newestCohortLabel: newest?.label ?? "—", newestShare, oldestShare };
  }, [report]);

  // ── Cohort table ──────────────────────────────────────────────────────────
  const tableRows: CohortTableRow[] = useMemo(() => {
    if (!report) return [];
    const recentDays = report.days.slice(-7);
    const recentTotal = recentDays.reduce((s, d) => s + d.totalSpend, 0);
    return report.cohorts
      .map((c) => {
        const last7 = recentDays.reduce((s, d) => s + (d.cohortSpend[c.key] ?? 0), 0);
        return {
          key: c.key, label: c.label, adCount: c.adCount,
          totalSpend: c.totalSpend,
          spendSharePct: report.totalSpend > 0 ? (c.totalSpend / report.totalSpend) * 100 : 0,
          last7SharePct: recentTotal > 0 ? (last7 / recentTotal) * 100 : 0,
          activeDays: report.days.filter((d) => (d.cohortSpend[c.key] ?? 0) > 0).length,
        };
      })
      .reverse();
  }, [report]);

  const cohortColumns: DataTableColumn<CohortTableRow>[] = useMemo(() => [
    { key: "label", header: "Launch Month", accessor: (r) => r.key, render: (r) => r.label },
    { key: "adCount", header: "Ads", help: GLOSSARY.adsInCohort, accessor: (r) => r.adCount, align: "right", render: (r) => formatNumber(r.adCount) },
    { key: "totalSpend", header: "Spend", help: GLOSSARY.spend, accessor: (r) => r.totalSpend, align: "right", render: (r) => formatCurrencyCompact(r.totalSpend) },
    { key: "spendSharePct", header: "Share of Total", help: GLOSSARY.shareOfTotal, accessor: (r) => r.spendSharePct, align: "right", render: (r) => formatPercent(r.spendSharePct) },
    {
      key: "last7SharePct", header: "Last 7 Days Share",
      help: "Share of the most recent week's spend still going to this cohort.",
      accessor: (r) => r.last7SharePct, align: "right",
      render: (r) => (
        <span className={r.last7SharePct > 2 ? "font-medium text-slate-800" : "text-slate-400"}>
          {formatPercent(r.last7SharePct)}
        </span>
      ),
    },
    { key: "activeDays", header: "Active Days", help: GLOSSARY.activeDays, accessor: (r) => r.activeDays, align: "right" },
  ], []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function toggleAdSelection(adId: string) {
    setSelectedAdIds((prev) => {
      const next = new Set(prev);
      if (next.has(adId)) { next.delete(adId); } else if (next.size < 5) { next.add(adId); }
      return next;
    });
  }

  function scrollToHeatmap(status?: AdStatus) {
    if (status) setHeatmapStatusFilter(status === heatmapStatusFilter ? null : status);
    setHeatmapSort("status");
    setTimeout(() => heatmapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Creative Churn</h1>
          <p className="mt-1 text-sm text-slate-500">How fast new creatives replace old ones in your ad spend.</p>
          <div className="mt-1"><FreshnessStamp fetchedAt={fetchedAt} /></div>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={range} onChange={setRange} />
          <button
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh — fetch fresh data from Meta"
            className="rounded-md border border-slate-200 bg-white p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-brand-600 disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={loading ? "animate-spin" : ""}>
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </button>
        </div>
      </div>

      {!progress && (loading || (range && !data)) && <FetchingState />}
      {loading && progress && (
        <div className="mt-4">
          <ProgressIndicator current={progress.current} total={progress.total} label={progress.label} onCancel={cancel} />
        </div>
      )}

      {error && !loading && (
        <ErrorBanner
          message={error}
          code={errorCode}
          onRetry={handleRefresh}
          onRetryShorter={() => setRange(lastNMonths(1))}
        />
      )}

      {range && (
        <div className="animate-fade-in">
          {/* ── 1. KPI strip ──────────────────────────────────────────── */}
          <div className={`mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <SummaryCard
              label="Active Creatives"
              value={kpis ? formatNumber(kpis.activeCreatives) : "—"}
              sublabel="ads with spend in period"
              loading={isInitialLoad}
            />
            <SummaryCard
              label="Newest Cohort Share"
              value={kpis ? formatPercent(kpis.newestShare) : "—"}
              sublabel={kpis?.newestCohortLabel ?? "most recent launch month"}
              loading={isInitialLoad}
            />
            <SummaryCard
              label="Legacy Creative Share"
              value={kpis ? formatPercent(kpis.oldestShare) : "—"}
              sublabel="spend on pre-window ads"
              loading={isInitialLoad}
            />
          </div>

          <div className={`mt-4 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <ReportSummary insights={insights} loading={isInitialLoad} />
          </div>

          {/* ── 2. Cohort area chart ───────────────────────────────────── */}
          <div className={`mt-6 rounded-xl border border-hairline bg-surface-card p-5 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <h2 className="text-base font-bold text-slate-800">Spend by Creative Cohort</h2>
            <p className="mt-0.5 text-xs text-slate-400">Each color represents spend from ads that launched in that month</p>
            {isInitialLoad ? (
              <ChartSkeleton />
            ) : (
              <>
                <div className="mt-4">
                  <CohortAreaChart
                    data={chartData}
                    xKey="date"
                    series={chartSeries}
                    onRangeChange={(start, end) => setVisibleRange([start, end])}
                  />
                </div>
                <p className="mt-1 text-center text-[11px] text-slate-400">
                  Click a band to pin its highlight · drag the mini-map handles, scroll, or drag on the chart to zoom
                </p>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => setHowToOpen((o) => !o)}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-brand-600"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                    How to Read
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${howToOpen ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                  {howToOpen && (
                    <div className="mt-2 rounded-lg bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
                      <p>Each colored band shows how much you spent <strong>that period</strong> on ads that first launched in a given month. The gray base is legacy creative launched before this window.</p>
                      <p className="mt-1.5">Healthy creative rotation looks like new colors steadily taking over the top of the stack. If the gray or older bands stay thick, spend is stuck on aging creatives — time to refresh.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── 3. Creative Performance section ─────────────────────────── */}
          {!isInitialLoad && report && (
            <>
              <div className="mt-10 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Creative Performance</h2>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* ── 4. Treemap ─────────────────────────────────────────── */}
              {treemapData.length > 0 && (
                <div className="mt-6 rounded-xl border border-hairline bg-surface-card p-5">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Where is spend going now?</h3>
                      <p className="mt-0.5 text-xs text-slate-400">Rectangle size = current period spend. Color = trend direction.</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-3 text-[11px]">
                      {(["scaling", "fading", "steady", "new"] as AdStatus[]).map((s) => (
                        <span key={s} className="flex items-center gap-1">
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_META[s].dot, display: "inline-block" }} />
                          <span className="text-ink-secondary capitalize">{STATUS_META[s].label}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <Treemap
                      data={treemapData}
                      dataKey="value"
                      nameKey="name"
                      isAnimationActive={animate}
                      animationDuration={400}
                      content={(cellProps) => {
                        const item = treemapData.find((d) => d.name === cellProps.name);
                        return (
                          <TreemapCell
                            {...cellProps}
                            status={item?.status ?? "steady"}
                            totalSpend={item?.totalSpend ?? 0}
                            prevSpend={item?.prevSpend ?? 0}
                          />
                        );
                      }}
                    />
                  </ResponsiveContainer>
                </div>
              )}

              {/* ── 5. Summary bar ──────────────────────────────────────── */}
              {summaryBar && (summaryBar.groups.scaling.count + summaryBar.groups.fading.count + summaryBar.groups.steady.count) > 0 && (
                <div className="mt-4 grid grid-cols-3 divide-x divide-hairline rounded-xl border border-hairline bg-surface-card overflow-hidden">
                  {(["scaling", "fading", "steady"] as const).map((status) => {
                    const g = summaryBar.groups[status];
                    const s = STATUS_META[status];
                    const sharePct = summaryBar.currentTotal > 0 ? (g.spend / summaryBar.currentTotal) * 100 : 0;
                    const icons = { scaling: "📈", fading: "📉", steady: "📊" };
                    return (
                      <div key={status} className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: s.color }}>
                          <span>{icons[status]}</span>
                          <span className="capitalize">{s.label}</span>
                          <span className="rounded-full bg-surface-app px-1.5 py-0.5 text-[10px] font-medium text-ink-tertiary">{g.count}</span>
                        </div>
                        <div className="mt-1 font-mono text-[17px] font-semibold tabular-nums text-ink">{formatCurrencyCompact(g.spend)}</div>
                        <div className="mt-0.5 text-[11px] text-ink-tertiary">{formatPercent(sharePct)} of current period</div>
                        <button
                          onClick={() => scrollToHeatmap(status)}
                          className="mt-1.5 text-[11px] font-medium text-brand-600 hover:underline"
                        >
                          View in heatmap →
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── 6. Heatmap ──────────────────────────────────────────── */}
              {sortedAds.length > 0 && (
                <div ref={heatmapRef} className="mt-6 rounded-xl border border-hairline bg-surface-card p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Spend by Creative Over Time</h3>
                      <p className="mt-0.5 text-xs text-slate-400">Color intensity = spend. Click a row to select for comparison (max 5).</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {heatmapStatusFilter && (
                        <button
                          onClick={() => setHeatmapStatusFilter(null)}
                          className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-100"
                        >
                          {STATUS_META[heatmapStatusFilter].label} ✕
                        </button>
                      )}
                      <select
                        value={heatmapSort}
                        onChange={(e) => setHeatmapSort(e.target.value as HeatmapSort)}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                      >
                        <option value="totalSpend">Total Spend ▾</option>
                        <option value="currentPeriod">Current Period</option>
                        <option value="biggestChange">Biggest Change</option>
                        <option value="status">Status</option>
                        <option value="nameAsc">Name A–Z</option>
                      </select>
                    </div>
                  </div>

                  {/* Color legend */}
                  <div className="mb-3 flex items-center gap-1.5">
                    <span className="text-[10px] text-ink-tertiary">Spend:</span>
                    <div className="flex items-center gap-0.5">
                      {HEATMAP_COLORS.map((c, i) => (
                        <div key={i} style={{ width: 18, height: 10, background: c, borderRadius: 2 }} />
                      ))}
                    </div>
                    <div className="flex gap-2 text-[10px] text-ink-tertiary">
                      <span>₹0</span>
                      <span>{formatCurrencyCompact(quantileLegend[2] ?? 0)}</span>
                      <span>{formatCurrencyCompact(quantileLegend[4] ?? 0)}</span>
                    </div>
                  </div>

                  {/* The grid */}
                  <div style={{ maxHeight: 560, overflowY: "auto", overflowX: "hidden" }}>
                    {/* Header row */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `180px repeat(${report.days.length}, 1fr)`,
                        gap: 2,
                        position: "sticky",
                        top: 0,
                        zIndex: 10,
                        background: "var(--color-surface-card, #fff)",
                        paddingBottom: 2,
                      }}
                    >
                      <div />
                      {report.days.map((day) => (
                        <div
                          key={day.date}
                          style={{
                            fontSize: 10,
                            color: hoveredCol === day.date ? "#2563EB" : "#94A3B8",
                            fontFamily: "var(--font-mono)",
                            textAlign: "center",
                            paddingBottom: 2,
                            fontWeight: hoveredCol === day.date ? 600 : 400,
                          }}
                        >
                          {formatShortDate(day.date).split(" ")[0]}
                        </div>
                      ))}
                    </div>

                    {/* Data rows */}
                    {sortedAds.map((ad) => {
                      const status = adStatusMap.get(ad.adId) ?? "paused";
                      const s = STATUS_META[status];
                      const isSelected = selectedAdIds.has(ad.adId);
                      const isHovered = hoveredAdId === ad.adId;
                      const isDisabled = selectedAdIds.size >= 5 && !isSelected;
                      return (
                        <div
                          key={ad.adId}
                          style={{
                            display: "grid",
                            gridTemplateColumns: `180px repeat(${report.days.length}, 1fr)`,
                            gap: 2,
                            marginBottom: 2,
                            opacity: isHovered ? 1 : hoveredAdId ? 0.4 : 1,
                            cursor: isDisabled ? "not-allowed" : "pointer",
                          }}
                          onClick={() => !isDisabled && toggleAdSelection(ad.adId)}
                          onMouseEnter={() => setHoveredAdId(ad.adId)}
                          onMouseLeave={() => setHoveredAdId(null)}
                        >
                          {/* Row label */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              paddingRight: 6,
                              height: 24,
                            }}
                          >
                            <div style={{ width: 3, height: 16, borderRadius: 2, background: s.dot, flexShrink: 0 }} />
                            {isSelected && <div style={{ width: 3, height: 16, borderRadius: 2, background: "#2563EB", flexShrink: 0 }} />}
                            <span
                              style={{
                                fontSize: 11,
                                color: isSelected ? "#1D4ED8" : "#334155",
                                fontWeight: isSelected ? 600 : 400,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={ad.adName}
                            >
                              {truncateAdName(ad.adName)}
                            </span>
                          </div>

                          {/* Cells */}
                          {report.days.map((day) => {
                            const spend = ad.spendByPeriod[day.date] ?? 0;
                            const isColHovered = hoveredCol === day.date;
                            return (
                              <div
                                key={day.date}
                                style={{
                                  height: 24,
                                  borderRadius: 3,
                                  background: colorScale(spend),
                                  border: isColHovered || isSelected ? "1.5px solid #2563EB" : isSelected ? "1.5px solid #2563EB" : "none",
                                  boxSizing: "border-box",
                                }}
                                title={spend > 0 ? `${ad.adName}\n${formatShortDate(day.date)}: ${formatCurrency(spend)}` : undefined}
                                onMouseEnter={() => setHoveredCol(day.date)}
                                onMouseLeave={() => setHoveredCol(null)}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {sortedAds.length > 20 && (
                    <p className="mt-2 text-center text-[11px] text-ink-tertiary">
                      Showing {sortedAds.length} creatives — scroll to see all
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── 8. Compare line chart (when open) ───────────────────────── */}
          {compareOpen && compareAds.length > 0 && (
            <div className="mt-6 rounded-xl border border-brand-200 bg-surface-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Creative Comparison</h3>
                  <p className="mt-0.5 text-xs text-slate-400">Spend over time for selected creatives</p>
                </div>
                <button
                  onClick={() => { setCompareOpen(false); setSelectedAdIds(new Set()); }}
                  className="text-xs font-medium text-slate-400 hover:text-slate-700"
                >
                  ✕ Close
                </button>
              </div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={compareData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: CHART_INK.muted, fontFamily: "var(--font-mono)" }} axisLine={{ stroke: CHART_CHROME.axis }} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: CHART_INK.muted, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => formatCurrencyCompact(v)} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const ranked = [...payload].filter((p) => p.value != null).sort((a, b) => Number(b.value) - Number(a.value));
                        return (
                          <div style={{ background: "#1E293B", borderRadius: 8, padding: "10px 14px", minWidth: 200 }}>
                            <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 6 }}>{label}</p>
                            {ranked.map((p) => (
                              <div key={p.dataKey as string} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 3 }}>
                                <span style={{ color: p.color as string, fontSize: 12, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {compareAds.find((a) => a.adId === p.dataKey)?.adName ?? (p.dataKey as string)}
                                </span>
                                <span style={{ color: "#F1F5F9", fontSize: 12, fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                                  {formatCurrencyCompact(Number(p.value))}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                      wrapperStyle={{ zIndex: 9999 }}
                    />
                    {compareAds.map((ad, i) => (
                      <Line
                        key={ad.adId}
                        dataKey={ad.adId}
                        stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 4, strokeWidth: 0, fill: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        connectNulls={false}
                        isAnimationActive={animate}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-4">
                {compareAds.map((ad, i) => (
                  <div key={ad.adId} className="flex items-center gap-1.5 text-xs">
                    <span style={{ width: 10, height: 3, borderRadius: 2, background: COMPARE_COLORS[i % COMPARE_COLORS.length], display: "inline-block" }} />
                    <span className="text-slate-600" title={ad.adName}>{truncateAdName(ad.adName, 40)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 9. Cohort table ──────────────────────────────────────────── */}
          <div className="mt-6">
            <DataTable
              columns={cohortColumns}
              rows={tableRows}
              loading={isInitialLoad}
              filename="creative-churn"
              defaultSortKey="label"
              defaultSortDir="desc"
            />
          </div>
        </div>
      )}

      {/* ── 7. Floating compare bar ─────────────────────────────────────── */}
      {selectedAdIds.size > 0 && !compareOpen && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 shadow-xl shadow-black/10">
            <div className="text-sm text-slate-700">
              <span className="font-semibold">{selectedAdIds.size}</span>{" "}
              {selectedAdIds.size === 1 ? "creative" : "creatives"} selected
              {selectedAdIds.size < 5 && <span className="ml-1 text-slate-400">({5 - selectedAdIds.size} more allowed)</span>}
            </div>
            <button
              onClick={() => setCompareOpen(true)}
              className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Compare ▸
            </button>
            <button
              onClick={() => setSelectedAdIds(new Set())}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
