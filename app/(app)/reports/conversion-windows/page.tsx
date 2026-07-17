"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "@/components/providers/AccountProvider";
import { useDateRange } from "@/components/providers/DateRangeProvider";
import { useJsonReport } from "@/lib/hooks/useJsonReport";
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
import { formatCurrency, formatNumber, formatPercent, formatShortDate } from "@/lib/format";
import { percent } from "@/lib/calculations";
import { conversionFindings } from "@/lib/findings";
import { GLOSSARY } from "@/lib/glossary";
import { lastNDays, lastNMonths } from "@/lib/dates";
import { MIN_USEFUL_MONTHS } from "@/lib/constants";
import type { DateRange } from "@/lib/types";
import type { ConversionWindowWeekRow, ConversionWindowsReport } from "@/lib/reports/conversion-windows";

export default function ConversionWindowsPage() {
  const { selectedAccountId } = useAccount();
  const { range, setRange, applyInitialMonths } = useDateRange();
  useEffect(() => { applyInitialMonths(MIN_USEFUL_MONTHS["conversion-windows"]); }, [applyInitialMonths]);
  // [PM ENHANCEMENT] — bump to re-run the fetch from the error banner's "Try again"
  const [retryKey, setRetryKey] = useState(0);
  const { loading, isInitialLoad, data, error, errorCode, fetchedAt, run } = useJsonReport<{ data: ConversionWindowsReport }>();

  useEffect(() => {
    if (!selectedAccountId || !range) return;
    const params = new URLSearchParams({ accountId: selectedAccountId, since: range.since, until: range.until });
    run(`/api/reports/conversion-windows?${params}`);
  }, [selectedAccountId, range, run, retryKey]);

  const report = data?.data;

  const columns: DataTableColumn<ConversionWindowWeekRow>[] = [
    { key: "weekStart", header: "Week", accessor: (r) => r.weekStart, render: (r) => r.isPartial ? `${formatShortDate(r.weekStart)} (partial)` : formatShortDate(r.weekStart) },
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
    { key: "spend", header: "Spend", accessor: (r) => r.spend, align: "right", render: (r) => formatCurrency(r.spend) },
  ];

  const chartData = useMemo(() => {
    if (!report) return [];
    return report.weeks.map((w) => ({
      week: w.isPartial ? `${formatShortDate(w.weekStart)} (partial)` : formatShortDate(w.weekStart),
      within1Day: percent(w.purchases1dc, w.purchases28dc),
      day2to7: percent(w.purchases7dc - w.purchases1dc, w.purchases28dc),
      day8to28: percent(w.purchases28dc - w.purchases7dc, w.purchases28dc),
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
          <p className="mt-1 text-sm text-slate-500">Compare 1-day, 7-day, and 28-day attribution to understand how long conversions take.</p>
          <div className="mt-1"><FreshnessStamp fetchedAt={fetchedAt} /></div>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* [PM ENHANCEMENT] — plain-language explainer so every metric is understandable */}
      <HowToRead
        items={[
          { label: "1DC / 7DC / 28DC", text: "purchases Meta credits to an ad within 1, 7, or 28 days of someone clicking it." },
          { label: "Uplift Ratio", text: "how many extra purchases the 28-day view adds vs the 1-day view. High = customers take days to decide; low = they buy fast." },
          { label: "% Same-Day", text: "the share of all attributed purchases that happened within a day of the click — your impulse-purchase rate." },
          { label: "The chart", text: "each bar splits a week's purchases by how long they took; the pink line tracks the uplift ratio on the right axis." },
        ]}
      />

      {loading && <FetchingState />}

      {!range && <EmptyState title="Select a date range" description="Choose a period above to load this report." />}

      {range && (
        <div className="animate-fade-in">
          <div className={`mt-4 grid grid-cols-1 gap-3 transition-opacity duration-200 sm:grid-cols-3 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
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
              label="Uplift Ratio"
              value={report ? formatPercent(report.overallUpliftRatio) : "—"}
              sublabel="28DC vs 1DC"
              help={GLOSSARY.upliftRatio}
              loading={isInitialLoad}
            />
          </div>

          <FindingsStrip findings={findingsList} loading={isInitialLoad} />

          <div className={`mt-6 rounded-xl border border-hairline bg-surface-card p-5 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <h2 className="text-sm font-semibold text-slate-800">Purchases by attribution window</h2>
            <p className="mb-4 mt-0.5 text-xs text-slate-400">Weekly purchase share by how long after the ad click they happened, with the uplift ratio (28DC vs 1DC) overlaid.</p>
            {isInitialLoad ? (
              <ChartSkeleton />
            ) : (
              <DualAxisChart
                data={chartData}
                xKey="week"
                bars={[
                  { key: "within1Day", label: "Within 1 day", color: "#1d4ed8" },
                  { key: "day2to7", label: "Day 2–7", color: "#0891b2" },
                  { key: "day8to28", label: "Day 8–28", color: "#d97706" },
                ]}
                lines={[{ key: "upliftRatio", label: "Uplift Ratio", color: "#f59e0b" }]}
                barFormat="percent"
                lineFormat="percent"
                barDomain={[70, 100]}
                lineDomain={[0, "auto"]}
                xTitle="Week starting"
                yTitle="% of purchases"
                yRightTitle="Uplift ratio (%)"
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
