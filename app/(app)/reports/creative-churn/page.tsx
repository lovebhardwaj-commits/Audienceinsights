"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "@/components/providers/AccountProvider";
import { useJsonReport } from "@/lib/hooks/useJsonReport";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { SpendIcon, ChartBarIcon, ClockSmallIcon } from "@/components/ui/KpiIcons";
import { CohortAreaChart } from "@/components/charts/CohortAreaChart";
import { ReportSummary } from "@/components/ui/ReportSummary";
import { EmptyState } from "@/components/ui/EmptyState";
import { FetchingState } from "@/components/ui/FetchingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { formatCurrency, formatCurrencyCompact, formatNumber, formatPercent, formatShortDate } from "@/lib/format";
import { creativeChurnInsights } from "@/lib/insights";
import { GLOSSARY } from "@/lib/glossary";
import type { DateRange } from "@/lib/types";
import { PRE_COHORT_KEY, type CreativeChurnReport } from "@/lib/reports/creative-churn";

// Muted/pastel qualitative palette from the design spec — the gray base layer is
// reserved for the "Pre-{month}" legacy cohort, monthly cohorts cycle the rest.
const PRE_COHORT_COLOR = "#9CA3A8";
const COHORT_PALETTE = [
  "#DE7C75", // muted coral
  "#5EB0AC", // teal
  "#5497AC", // steel blue
  "#94B8A8", // muted sea green
  "#F1D77E", // pale yellow
  "#CBA0CB", // orchid
  "#93C8BC", // mint
  "#E8C15D", // gold
];

interface CohortTableRow {
  key: string;
  label: string;
  adCount: number;
  totalSpend: number;
  spendSharePct: number;
  last7SharePct: number;
  activeDays: number;
}

export default function CreativeChurnPage() {
  const { selectedAccountId } = useAccount();
  const [range, setRange] = useState<DateRange | null>(null);
  const [visibleRange, setVisibleRange] = useState<[number, number] | null>(null);
  const [howToOpen, setHowToOpen] = useState(false);
  // [PM ENHANCEMENT] — bump to re-run the fetch from the error banner's "Try again"
  const [retryKey, setRetryKey] = useState(0);
  const { loading, isInitialLoad, data, error, run } = useJsonReport<{ data: CreativeChurnReport }>();

  useEffect(() => {
    if (!selectedAccountId || !range) return;
    setVisibleRange(null); // new fetch resets the brush window
    const params = new URLSearchParams({ accountId: selectedAccountId, since: range.since, until: range.until });
    run(`/api/reports/creative-churn?${params}`);
  }, [selectedAccountId, range, run, retryKey]);

  const report = data?.data;
  const insights = useMemo(() => (report ? creativeChurnInsights(report) : []), [report]);

  const chartSeries = useMemo(() => {
    if (!report) return [];
    let colorIdx = 0;
    return report.cohorts.map((c) => ({
      key: c.key,
      label: c.label,
      color: c.key === PRE_COHORT_KEY ? PRE_COHORT_COLOR : COHORT_PALETTE[colorIdx++ % COHORT_PALETTE.length],
    }));
  }, [report]);

  const chartData = useMemo(() => {
    if (!report) return [];
    return report.days.map((day) => {
      const point: Record<string, string | number> = { date: formatShortDate(day.date) };
      for (const c of report.cohorts) point[c.key] = Math.round(day.cohortSpend[c.key] ?? 0);
      return point;
    });
  }, [report]);

  // "Visible Range" KPI follows the brush handles live.
  const visibleRangeLabel = useMemo(() => {
    if (!report || report.days.length === 0) return "—";
    const [startIdx, endIdx] = visibleRange ?? [0, report.days.length - 1];
    const start = report.days[Math.max(0, Math.min(startIdx, report.days.length - 1))];
    const end = report.days[Math.max(0, Math.min(endIdx, report.days.length - 1))];
    return `${formatShortDate(start.date)} – ${formatShortDate(end.date)}`;
  }, [report, visibleRange]);

  const tableRows: CohortTableRow[] = useMemo(() => {
    if (!report) return [];
    const recentDays = report.days.slice(-7);
    const recentTotal = recentDays.reduce((s, d) => s + d.totalSpend, 0);
    return report.cohorts
      .map((c) => {
        const last7 = recentDays.reduce((s, d) => s + (d.cohortSpend[c.key] ?? 0), 0);
        return {
          key: c.key,
          label: c.label,
          adCount: c.adCount,
          totalSpend: c.totalSpend,
          spendSharePct: report.totalSpend > 0 ? (c.totalSpend / report.totalSpend) * 100 : 0,
          last7SharePct: recentTotal > 0 ? (last7 / recentTotal) * 100 : 0,
          activeDays: report.days.filter((d) => (d.cohortSpend[c.key] ?? 0) > 0).length,
        };
      })
      .reverse(); // newest launch month first
  }, [report]);

  const columns: DataTableColumn<CohortTableRow>[] = useMemo(
    () => [
      { key: "label", header: "Launch Month", accessor: (r) => r.key, render: (r) => r.label },
      { key: "adCount", header: "Ads", help: GLOSSARY.adsInCohort, accessor: (r) => r.adCount, align: "right", render: (r) => formatNumber(r.adCount) },
      { key: "totalSpend", header: "Spend", help: GLOSSARY.spend, accessor: (r) => r.totalSpend, align: "right", render: (r) => formatCurrencyCompact(r.totalSpend) },
      { key: "spendSharePct", header: "Share of Total", help: GLOSSARY.shareOfTotal, accessor: (r) => r.spendSharePct, align: "right", render: (r) => formatPercent(r.spendSharePct) },
      {
        key: "last7SharePct",
        header: "Last 7 Days Share",
        help: "Share of the most recent week's spend still going to this cohort — 0% means fully replaced.",
        accessor: (r) => r.last7SharePct,
        align: "right",
        render: (r) => (
          <span className={r.last7SharePct > 2 ? "font-medium text-slate-800" : "text-slate-400"}>
            {formatPercent(r.last7SharePct)}
          </span>
        ),
      },
      { key: "activeDays", header: "Active Days", help: GLOSSARY.activeDays, accessor: (r) => r.activeDays, align: "right" },
    ],
    []
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Creative Churn</h1>
          <p className="mt-1 text-sm text-slate-500">How fast new creatives replace old ones in your ad spend.</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {error && <ErrorBanner message={error} onRetry={() => setRetryKey((k) => k + 1)} />}
      {loading && <FetchingState />}

      {!range && <EmptyState title="Select a date range" description="Choose a period above to load this report." />}

      {range && (
        <div className="animate-fade-in">
          {/* KPI strip */}
          <div className={`mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <SummaryCard
              label="Total Spend"
              value={report ? formatCurrencyCompact(report.totalSpend) : "—"}
              title={report ? formatCurrency(report.totalSpend) : undefined}
              loading={isInitialLoad}
              icon={<SpendIcon />}
              iconColor="bg-emerald-50 text-emerald-600"
              accentColor="border-l-emerald-500"
            />
            <SummaryCard
              label="Active Cohorts"
              value={report ? formatNumber(report.cohorts.length) : "—"}
              sublabel="launch months with spend"
              loading={isInitialLoad}
              icon={<ChartBarIcon />}
              iconColor="bg-blue-50 text-blue-600"
              accentColor="border-l-blue-500"
            />
            <SummaryCard
              label="Visible Range"
              value={visibleRangeLabel}
              sublabel="drag the slider to zoom"
              loading={isInitialLoad}
              icon={<ClockSmallIcon />}
              iconColor="bg-violet-50 text-violet-600"
              accentColor="border-l-violet-500"
            />
          </div>

          <div className={`mt-4 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <ReportSummary insights={insights} loading={isInitialLoad} />
          </div>

          {/* Chart card */}
          <div className={`mt-6 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
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
                <p className="mt-1 text-center text-[11px] text-slate-400">Drag handles to zoom</p>

                {/* Legend — all cohorts, stack order */}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
                  {chartSeries.map((s) => (
                    <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                      {s.label}
                    </span>
                  ))}
                </div>

                {/* How to read */}
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => setHowToOpen((o) => !o)}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-brand-600"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </svg>
                    How to Read This Chart
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${howToOpen ? "rotate-180" : ""}`}>
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {howToOpen && (
                    <div className="mt-2 rounded-lg bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
                      <p>Each colored band shows how much you spent <strong>that day</strong> on ads that first launched in a given month. The gray base is legacy creative launched before this window.</p>
                      <p className="mt-1.5">Healthy creative rotation looks like new colors steadily taking over the top of the stack. If the gray or older bands stay thick, spend is stuck on aging creatives — time to refresh.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="mt-6">
            <DataTable
              columns={columns}
              rows={tableRows}
              loading={isInitialLoad}
              filename="creative-churn"
              defaultSortKey="label"
              defaultSortDir="desc"
            />
          </div>
        </div>
      )}
    </div>
  );
}
