"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "@/components/providers/AccountProvider";
import { useDateRange } from "@/components/providers/DateRangeProvider";
import { useStreamingReport } from "@/lib/hooks/useStreamingReport";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { CohortAreaChart } from "@/components/charts/CohortAreaChart";
import { ReportSummary } from "@/components/ui/ReportSummary";
import { FetchingState } from "@/components/ui/FetchingState";
import { FreshnessStamp } from "@/components/ui/FreshnessStamp";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { formatCurrency, formatCurrencyCompact, formatNumber, formatPercent, formatShortDate } from "@/lib/format";
import { creativeChurnInsights } from "@/lib/insights";
import { GLOSSARY } from "@/lib/glossary";
import { lastNMonths, daysInclusive } from "@/lib/dates";
import { MIN_USEFUL_MONTHS } from "@/lib/constants";
import { PRE_COHORT_KEY, OTHER_COHORT_KEY, type ChurnGranularity, type CreativeChurnReport } from "@/lib/reports/creative-churn";

// Muted/pastel qualitative palette from the design spec — the gray base layer is
// reserved for the "Pre-{month}" legacy cohort and the folded "Other" bucket.
const PRE_COHORT_COLOR = "#9CA3A8";
const OTHER_COHORT_COLOR = "#C4C2BC";
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
  const { range, setRange, applyInitialMonths } = useDateRange();
  // Auto-load at a weekly 3-month default — the rescue that makes this viable in nav (7.7).
  useEffect(() => { applyInitialMonths(MIN_USEFUL_MONTHS["creative-churn"]); }, [applyInitialMonths]);
  const [granularity, setGranularity] = useState<ChurnGranularity>("weekly");
  const [visibleRange, setVisibleRange] = useState<[number, number] | null>(null);
  const [howToOpen, setHowToOpen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const { loading, isInitialLoad, data, error, errorCode, progress, fetchedAt, run, cancel } = useStreamingReport<CreativeChurnReport>();

  // Daily granularity is only safe on short ranges — force weekly beyond ~2 months.
  const rangeDays = range ? daysInclusive(range.since, range.until) : 0;
  const dailyAllowed = rangeDays > 0 && rangeDays <= 62;
  const effectiveGranularity: ChurnGranularity = granularity === "daily" && dailyAllowed ? "daily" : "weekly";

  useEffect(() => {
    if (!selectedAccountId || !range) return;
    setVisibleRange(null); // new fetch resets the brush window
    const params = new URLSearchParams({
      accountId: selectedAccountId,
      since: range.since,
      until: range.until,
      granularity: effectiveGranularity,
      topN: "8",
    });
    run(`/api/reports/creative-churn?${params}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, range, effectiveGranularity, retryKey]);

  const report = data ?? undefined;
  const insights = useMemo(() => (report ? creativeChurnInsights(report) : []), [report]);

  const chartSeries = useMemo(() => {
    if (!report) return [];
    let colorIdx = 0;
    return report.cohorts.map((c) => ({
      key: c.key,
      label: c.label,
      color:
        c.key === PRE_COHORT_KEY ? PRE_COHORT_COLOR : c.key === OTHER_COHORT_KEY ? OTHER_COHORT_COLOR : COHORT_PALETTE[colorIdx++ % COHORT_PALETTE.length],
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
          <div className="mt-1"><FreshnessStamp fetchedAt={fetchedAt} /></div>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Weekly is the safe default; daily unlocks only on ≤2-month ranges (7.7). */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex rounded-md border border-hairline bg-surface-card p-0.5">
          {(["weekly", "daily"] as ChurnGranularity[]).map((g) => {
            const disabled = g === "daily" && !dailyAllowed;
            return (
              <button
                key={g}
                onClick={() => !disabled && setGranularity(g)}
                disabled={disabled}
                title={disabled ? "Daily is available on ranges up to 2 months" : undefined}
                className={`rounded px-3 py-1 text-sm font-medium capitalize transition-colors ${
                  effectiveGranularity === g ? "bg-slate-900 text-white" : disabled ? "cursor-not-allowed text-ink-tertiary/50" : "text-ink-secondary hover:bg-surface-app"
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
        {!dailyAllowed && <span className="text-[11px] text-ink-tertiary">Daily unlocks on ranges ≤ 2 months</span>}
      </div>

      {error && (
        <ErrorBanner message={error} code={errorCode} onRetry={() => setRetryKey((k) => k + 1)} onRetryShorter={() => setRange(lastNMonths(1))} />
      )}
      {loading && !progress && <FetchingState reportWeight="heavy" />}
      {loading && progress && (
        <div className="mt-4"><ProgressIndicator current={progress.current} total={progress.total} label={progress.label} onCancel={cancel} /></div>
      )}

      {range && (
        <div className="animate-fade-in">
          {/* KPI strip */}
          <div className={`mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <SummaryCard
              label="Total Spend"
              value={report ? formatCurrencyCompact(report.totalSpend) : "—"}
              title={report ? formatCurrency(report.totalSpend) : undefined}
              loading={isInitialLoad}
            />
            <SummaryCard
              label="Active Cohorts"
              value={report ? formatNumber(report.cohorts.length) : "—"}
              sublabel="launch months with spend"
              loading={isInitialLoad}
            />
            <SummaryCard
              label="Visible Range"
              value={visibleRangeLabel}
              sublabel="drag the slider to zoom"
              loading={isInitialLoad}
            />
          </div>

          <div className={`mt-4 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <ReportSummary insights={insights} loading={isInitialLoad} />
          </div>

          {/* Chart card */}
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
                  Click a cohort to highlight it · Drag handles to zoom
                </p>

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
