"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAccount } from "@/components/providers/AccountProvider";
import { useJsonReport } from "@/lib/hooks/useJsonReport";
import { useReportRange } from "@/lib/hooks/useReportRange";
import { evictCached } from "@/lib/report-cache";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { FetchingState } from "@/components/ui/FetchingState";
import { FreshnessStamp } from "@/components/ui/FreshnessStamp";
import { HowToRead } from "@/components/ui/HowToRead";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { FindingsStrip } from "@/components/ui/FindingsStrip";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DualAxisChart } from "@/components/charts/DualAxisChart";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { formatCurrency, formatCurrencyCompact, formatNumber, formatPercent, formatShortDate } from "@/lib/format";
import { conversionFindings } from "@/lib/findings";
import { GLOSSARY } from "@/lib/glossary";
import { lastNDays } from "@/lib/dates";

import type { ConversionWindowWeekRow, ConversionWindowsReport } from "@/lib/reports/conversion-windows";

export default function ConversionWindowsPage() {
  const { selectedAccountId } = useAccount();
  const [range, setRange] = useReportRange("conversion-windows", 1);
  const currentUrlRef = useRef<string | null>(null);
  const { loading, isInitialLoad, data, error, errorCode, fetchedAt, run } = useJsonReport<{ data: ConversionWindowsReport }>();

  useEffect(() => {
    if (!selectedAccountId || !range) return;
    const params = new URLSearchParams({ accountId: selectedAccountId, since: range.since, until: range.until });
    const url = `/api/reports/conversion-windows?${params}`;
    currentUrlRef.current = url;
    run(url);
  }, [selectedAccountId, range, run]);

  function handleRefresh() {
    if (!currentUrlRef.current) return;
    evictCached(currentUrlRef.current);
    run(currentUrlRef.current);
  }

  const report = data?.data;

  const columns: DataTableColumn<ConversionWindowWeekRow>[] = [
    { key: "weekStart", header: "Week", accessor: (r) => r.weekStart, render: (r) => r.isPartial ? `${formatShortDate(r.weekStart)} (partial)` : formatShortDate(r.weekStart) },
    { key: "spend", header: "Spend", accessor: (r) => r.spend, align: "right", render: (r) => formatCurrency(r.spend) },
    { key: "purchasesTotal", header: "Total Purchases", help: GLOSSARY.attributionWindow, accessor: (r) => r.purchasesTotal, align: "right", render: (r) => formatNumber(r.purchasesTotal) },
    { key: "purchases1dv", header: "1DV Purchases", help: GLOSSARY.attributionWindow, accessor: (r) => r.purchases1dv, align: "right", render: (r) => formatNumber(r.purchases1dv) },
    { key: "purchases1dc", header: "1DC Purchases", help: GLOSSARY.attributionWindow, accessor: (r) => r.purchases1dc, align: "right", render: (r) => formatNumber(r.purchases1dc) },
    { key: "purchases7dc", header: "7DC Purchases", help: GLOSSARY.attributionWindow, accessor: (r) => r.purchases7dc, align: "right", render: (r) => formatNumber(r.purchases7dc) },
    { key: "purchases28dc", header: "28DC Purchases", help: GLOSSARY.attributionWindow, accessor: (r) => r.purchases28dc, align: "right", render: (r) => formatNumber(r.purchases28dc) },
    {
      key: "upliftRatio",
      header: "Uplift Ratio",
      help: GLOSSARY.upliftRatio,
      accessor: (r) => r.upliftRatio,
      align: "right",
      cellClass: (r) => r.isPartial ? "text-slate-400" : r.upliftRatio > 15 ? "text-red-600 font-semibold" : r.upliftRatio > 5 ? "text-amber-600" : "text-green-700",
      render: (r) => formatPercent(r.upliftRatio),
    },
    { key: "sameDayPct", header: "% Same-Day", help: GLOSSARY.sameDayPct, accessor: (r) => r.sameDayPct, align: "right", render: (r) => formatPercent(r.sameDayPct) },
  ];

  const chartData = useMemo(() => {
    if (!report) return [];
    return report.weeks.map((w) => ({
      week: w.isPartial ? `${formatShortDate(w.weekStart)} (partial)` : formatShortDate(w.weekStart),
      purchasesTotal: w.purchasesTotal,
      purchases1dv: w.purchases1dv,
      purchases1dc: w.purchases1dc,
      purchases7dc: w.purchases7dc,
      purchases28dc: w.purchases28dc,
      upliftRatio: w.upliftRatio,
    }));
  }, [report]);

  const findingsList = useMemo(() => (report ? conversionFindings(report) : []), [report]);
  // Trailing partial week gets faded in the chart (D6).
  const partialWeekIndex = useMemo(() => {
    const weeks = report?.weeks ?? [];
    const i = weeks.findIndex((w) => w.isPartial);
    return i >= 0 ? i : undefined;
  }, [report]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Conversion Windows</h1>
          <p className="mt-1 text-sm text-slate-500">Compare 1-day, 7-day, and 28-day click attribution — plus 1-day view-through — to understand how long conversions take.</p>
          <div className="mt-1"><FreshnessStamp fetchedAt={fetchedAt} /></div>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={range} onChange={setRange} />
          <button
            onClick={handleRefresh}
            title="Refresh report"
            className="rounded-md border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </button>
        </div>
      </div>

      <HowToRead
        items={[
          { label: "1DC / 7DC / 28DC", text: "purchases Meta credits to an ad within 1, 7, or 28 days of someone clicking it." },
          { label: "1DV", text: "1-day VIEW-through purchases — credited to an ad someone merely saw (no click) and bought within a day. A separate attribution model from 1DC/7DC/28DC, not additive with them." },
          { label: "Total Purchases", text: "7-day click + 1-day view purchases added together — Meta's \"7-day click or 1-day view\" attribution preset, approximated by summing the two windows. It can double-count a purchase that had both a qualifying view and a later click, so treat it as an upper bound, not an exact dedup." },
          { label: "Uplift Ratio", text: "how much bigger your 28-day purchase count is vs your 1-day count, as a %. E.g. 1DC = 10, 28DC = 30 → 200% uplift — two-thirds of buyers took more than a day. Low uplift (under ~20%) means 1-day numbers are reliable; high uplift means 1-day is heavily understating real performance and you need the longer window." },
          { label: "% Same-Day", text: "the share of all attributed purchases that happened within a day of the click — your impulse-purchase rate." },
          { label: "The chart", text: "each week shows Total, 1DV, 1DC, 7DC, and 28DC purchases as side-by-side bars (they overlap conceptually, so they're not stacked) with the uplift ratio as a line on the right axis." },
        ]}
      />

      {(loading || (range && !data)) && <FetchingState />}

      {!range && <EmptyState title="Select a date range" description="Choose a period above to load this report." />}

      {range && (
        <div className="animate-fade-in">
          <div className={`mt-4 grid grid-cols-1 gap-3 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <SummaryCard
              label="Total Purchases"
              value={report ? formatNumber(report.totalPurchasesTotal) : "—"}
              sublabel="7-day click + 1-day view"
              help={GLOSSARY.attributionWindow}
              loading={isInitialLoad}
            />
            <SummaryCard
              label="28DC Purchases"
              value={report ? formatNumber(report.totalPurchases28dc) : "—"}
              sublabel="within 28 days of click"
              loading={isInitialLoad}
            />
            <SummaryCard
              label="1DC Purchases"
              value={report ? formatNumber(report.totalPurchases1dc) : "—"}
              sublabel="same-day conversions"
              loading={isInitialLoad}
            />
            <SummaryCard
              label="1DV Purchases"
              value={report ? formatNumber(report.totalPurchases1dv) : "—"}
              sublabel="same-day, view-through"
              help={GLOSSARY.attributionWindow}
              loading={isInitialLoad}
            />
            <SummaryCard
              label="Uplift Ratio"
              value={report ? formatPercent(report.overallUpliftRatio) : "—"}
              sublabel="28DC vs 1DC"
              help={GLOSSARY.upliftRatio}
              loading={isInitialLoad}
            />
            <SummaryCard
              label="Cost Per Purchase"
              value={(() => {
                if (!report) return "—";
                const totalSpend = report.weeks.reduce((s, w) => s + w.spend, 0);
                return report.totalPurchases28dc > 0 ? formatCurrencyCompact(totalSpend / report.totalPurchases28dc) : "—";
              })()}
              sublabel="spend ÷ 28DC purchases"
              help="Total spend divided by total 28-day-click purchases. The full-funnel cost per attributed conversion — compare across periods to spot efficiency trends."
              loading={isInitialLoad}
              invertTrend
            />
          </div>

          <FindingsStrip findings={findingsList} loading={isInitialLoad} />

          <div className={`mt-6 rounded-xl border border-hairline bg-surface-card p-5 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <h2 className="text-sm font-semibold text-slate-800">Purchases by attribution window</h2>
            <p className="mb-4 mt-0.5 text-xs text-slate-400">Weekly purchase counts across each attribution window, with the uplift ratio (28DC vs 1DC) overlaid.</p>
            {isInitialLoad ? (
              <ChartSkeleton />
            ) : (
              <DualAxisChart
                data={chartData}
                xKey="week"
                bars={[
                  { key: "purchasesTotal", label: "Total Purchases", color: "#475569" },
                  { key: "purchases1dv", label: "1DV Purchases", color: "#7c3aed" },
                  { key: "purchases1dc", label: "1DC Purchases", color: "#1d4ed8" },
                  { key: "purchases7dc", label: "7DC Purchases", color: "#0891b2" },
                  { key: "purchases28dc", label: "28DC Purchases", color: "#d97706" },
                ]}
                lines={[{ key: "upliftRatio", label: "Uplift Ratio", color: "#f59e0b" }]}
                barFormat="compact"
                lineFormat="percent"
                lineDomain={[0, "auto"]}
                stacked={false}
                shareOfTotal={false}
                xTitle="Week starting"
                yTitle="Purchases"
                yRightTitle="Uplift Ratio (%)"
                partialIndex={partialWeekIndex}
                brush={false}
              />
            )}
          </div>

          <div className={`mt-6 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <DataTable
              columns={columns}
              rows={report?.weeks ?? []}
              loading={isInitialLoad}
              filename="conversion-windows"
              defaultSortKey="weekStart"
              defaultSortDir="asc"
            />
          </div>
        </div>
      )}
    </div>
  );
}
