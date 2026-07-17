"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "@/components/providers/AccountProvider";
import { useDateRange } from "@/components/providers/DateRangeProvider";
import { useJsonReport } from "@/lib/hooks/useJsonReport";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { HorizontalBar } from "@/components/charts/HorizontalBar";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { ReportSummary } from "@/components/ui/ReportSummary";
import { EmptyState } from "@/components/ui/EmptyState";
import { FetchingState } from "@/components/ui/FetchingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { HowToRead } from "@/components/ui/HowToRead";
import Link from "next/link";
import { formatCompactNumber, formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { creativeSegmentInsights } from "@/lib/insights";
import { GLOSSARY } from "@/lib/glossary";
import { SEGMENT_COLORS } from "@/lib/constants";
import { lastNDays, lastNMonths } from "@/lib/dates";
import type { DateRange } from "@/lib/types";
import type { EntitySegmentRow, CreativeSegmentsReport, EntityLevel } from "@/lib/reports/creative-segments";

function newPctCellClass(row: EntitySegmentRow): string {
  if (row.prospectingReachPct >= 70) return "text-green-700 font-semibold";
  if (row.prospectingReachPct < 40) return "text-red-600";
  return "text-amber-600";
}

const LEVELS: { key: EntityLevel; label: string }[] = [
  { key: "campaign", label: "Campaign" },
  { key: "adset", label: "Adset" },
  { key: "ad", label: "Ad" },
];

export default function CreativeSegmentsPage() {
  const { selectedAccountId } = useAccount();
  const { range, setRange } = useDateRange();
  const [level, setLevel] = useState<EntityLevel>("ad");
  // [PM ENHANCEMENT] — bump to re-run the fetch from the error banner's "Try again"
  const [retryKey, setRetryKey] = useState(0);
  const { loading, isInitialLoad, data, error, errorCode, run } = useJsonReport<{ data: CreativeSegmentsReport }>();

  useEffect(() => {
    if (!selectedAccountId || !range) return;
    const params = new URLSearchParams({
      accountId: selectedAccountId,
      since: range.since,
      until: range.until,
      level,
    });
    run(`/api/reports/creative-segments?${params}`);
  }, [selectedAccountId, range, level, run, retryKey]);

  const entities = data?.data.entities ?? [];
  const entityLabel = level === "campaign" ? "Campaign" : level === "adset" ? "Adset" : "Ad";

  const sorted = useMemo(() => [...entities].sort((a, b) => b.prospectingReachPct - a.prospectingReachPct), [entities]);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const highNewCount = entities.filter((e) => e.prospectingReachPct >= 70).length;

  const chartData = useMemo(
    () =>
      [...entities]
        .sort((a, b) => b.prospectingReachPct - a.prospectingReachPct)
        .slice(0, 25)
        .map((e) => ({
          name: e.name,
          New: e.prospectingReachPct,
          Engaged: e.engagedReachPct,
          Existing: e.existingReachPct,
        })),
    [entities]
  );

  const insights = useMemo(() => creativeSegmentInsights(entities, entityLabel), [entities, entityLabel]);

  const columns: DataTableColumn<EntitySegmentRow>[] = useMemo(() => [
    { key: "name", header: entityLabel, accessor: (r) => r.name },
    { key: "totalReach", header: "Total Reach", help: GLOSSARY.reach, accessor: (r) => r.totalReach, align: "right", render: (r) => formatCompactNumber(r.totalReach) },
    { key: "totalSpend", header: "Total Spend", help: GLOSSARY.spend, accessor: (r) => r.totalSpend, align: "right", render: (r) => formatCurrency(r.totalSpend) },
    { key: "totalPurchases", header: "Total Purchases", help: GLOSSARY.cpp, accessor: (r) => r.totalPurchases, align: "right", render: (r) => formatNumber(r.totalPurchases) },
    { key: "prospectingReach", header: "New Reach", help: GLOSSARY.prospecting, accessor: (r) => r.prospectingReach, align: "right", render: (r) => formatCompactNumber(r.prospectingReach) },
    {
      key: "prospectingReachPct",
      header: "New Reach %",
      help: GLOSSARY.newPct,
      accessor: (r) => r.prospectingReachPct,
      align: "right",
      cellClass: newPctCellClass,
      render: (r) => formatPercent(r.prospectingReachPct),
    },
    { key: "prospectingPurchases", header: "New Purchases", help: "Purchases attributed to the New Audience segment for this entity.", accessor: (r) => r.prospectingPurchases, align: "right", render: (r) => formatNumber(r.prospectingPurchases) },
    { key: "prospectingPurchasePct", header: "New Purchase %", help: "New Audience purchases as a % of this entity's total purchases.", accessor: (r) => r.prospectingPurchasePct, align: "right", render: (r) => formatPercent(r.prospectingPurchasePct) },
    { key: "prospectingCpa", header: "New CPA", help: GLOSSARY.cpp, accessor: (r) => r.prospectingCpa, align: "right", render: (r) => (r.prospectingCpa > 0 ? formatCurrency(r.prospectingCpa) : "—") },
    { key: "engagedReach", header: "Engaged Reach", accessor: (r) => r.engagedReach, align: "right", render: (r) => formatCompactNumber(r.engagedReach) },
    { key: "engagedPurchases", header: "Engaged Purchases", accessor: (r) => r.engagedPurchases, align: "right", render: (r) => formatNumber(r.engagedPurchases) },
    { key: "existingReach", header: "Existing Reach", accessor: (r) => r.existingReach, align: "right", render: (r) => formatCompactNumber(r.existingReach) },
    { key: "existingPurchases", header: "Existing Purchases", accessor: (r) => r.existingPurchases, align: "right", render: (r) => formatNumber(r.existingPurchases) },
  ], [entityLabel]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Segments by Entity</h1>
          <p className="mt-1 text-sm text-slate-500">Which campaigns, adsets, and ads reach the most genuinely new audiences.</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* [PM ENHANCEMENT] — plain-language explainer so every metric is understandable */}
      <HowToRead
        items={[
          { label: "The tabs", text: "the same analysis at three zoom levels — whole campaigns, individual adsets, or single ads." },
          { label: "New Reach %", text: "how much of this entity's audience is genuinely new people. Above 70% = a true prospecting workhorse." },
          { label: "New Purchase %", text: "of all purchases this entity drove, the share that came from brand-new customers rather than repeat buyers." },
          { label: "New CPA", text: "what one new customer costs from this entity — compare it against your product margin." },
          { label: "The chart", text: "each bar is 100% of one entity's reach, split into new (blue), engaged (amber), and existing (green), sorted best prospectors first." },
        ]}
      />

      <div className="mt-3">
        <div className="flex rounded-md border border-slate-200 bg-white p-0.5 w-fit">
          {LEVELS.map((l) => (
            <button
              key={l.key}
              onClick={() => setLevel(l.key)}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                level === l.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <ErrorBanner message={error} code={errorCode} onRetry={() => setRetryKey((k) => k + 1)} onRetryShorter={() => setRange(lastNMonths(1))} />
      )}
      {loading && <FetchingState />}

      {!range && <EmptyState title="Select a date range" description="Choose a period above to load this report." />}

      {range && (
        <div className="animate-fade-in">
          <div className={`mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <SummaryCard
              label={`Best Prospecting ${entityLabel}`}
              value={best ? formatPercent(best.prospectingReachPct) : "—"}
              sublabel={best?.name?.slice(0, 36)}
              loading={isInitialLoad}
              iconColor="bg-blue-50 text-blue-600"
              accentColor="border-l-blue-500"
            />
            <SummaryCard
              label={`Worst Prospecting ${entityLabel}`}
              value={worst && worst !== best ? formatPercent(worst.prospectingReachPct) : "—"}
              sublabel={worst && worst !== best ? worst.name.slice(0, 36) : undefined}
              loading={isInitialLoad}
              iconColor="bg-red-50 text-red-500"
              accentColor="border-l-red-400"
            />
            <SummaryCard
              label={`${entityLabel}s with >70% New`}
              value={data ? `${highNewCount} of ${entities.length}` : "—"}
              sublabel={highNewCount === 0 ? "none are strong prospectors" : "strong prospecting performers"}
              loading={isInitialLoad}
              iconColor="bg-emerald-50 text-emerald-600"
              accentColor="border-l-emerald-500"
            />
          </div>

          <div className={`transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <ReportSummary insights={insights} loading={isInitialLoad} />

            {(isInitialLoad || chartData.length > 0) && (
              <div className="mt-6 rounded-xl border border-hairline bg-surface-card p-5">
                <h2 className="text-sm font-semibold text-slate-800">
                  Audience segment composition by {entityLabel.toLowerCase()}
                </h2>
                <p className="mb-2 mt-0.5 text-xs text-slate-400">
                  Each bar = 100% of that {entityLabel.toLowerCase()}&apos;s reach. Sorted by new % descending.
                </p>
                <div className="mb-4 flex items-center gap-4">
                  {[
                    { color: SEGMENT_COLORS.prospecting, label: "New Audience" },
                    { color: SEGMENT_COLORS.engaged, label: "Engaged" },
                    { color: SEGMENT_COLORS.existing, label: "Existing Customers" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-xs text-slate-500">{s.label}</span>
                    </div>
                  ))}
                </div>
                {isInitialLoad ? (
                  <ChartSkeleton />
                ) : (
                  <HorizontalBar
                    data={chartData}
                    categoryKey="name"
                    stacked
                    valueFormat="percent"
                    series={[
                      { key: "New", label: "New Audience", color: SEGMENT_COLORS.prospecting },
                      { key: "Engaged", label: "Engaged", color: SEGMENT_COLORS.engaged },
                      { key: "Existing", label: "Existing Customers", color: SEGMENT_COLORS.existing },
                    ]}
                  />
                )}
              </div>
            )}

            <div className="mt-6">
              <DataTable
                columns={columns}
                rows={entities}
                loading={isInitialLoad}
                filename={`${level}-segments`}
                defaultSortKey="prospectingReachPct"
                defaultSortDir="desc"
              />
            </div>

            {/* [PM ENHANCEMENT] — cross-link instead of duplicating overlap analysis on this report */}
            <p className="mt-3 text-xs text-slate-400">
              Want to see how much unique reach each campaign contributes?{" "}
              <Link href="/reports/campaign-overlap" className="text-brand-600 underline-offset-2 hover:underline">
                Check the Campaign Overlap report →
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
