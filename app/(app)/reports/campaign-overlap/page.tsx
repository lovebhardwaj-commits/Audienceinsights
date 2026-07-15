"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "@/components/providers/AccountProvider";
import { useStreamingReport } from "@/lib/hooks/useStreamingReport";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { HorizontalBar } from "@/components/charts/HorizontalBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { FetchingState } from "@/components/ui/FetchingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { HowToRead } from "@/components/ui/HowToRead";
import { ReportSummary } from "@/components/ui/ReportSummary";
import { overlapInsights } from "@/lib/insights";
import { ReachIcon, SpendIcon, CountIcon } from "@/components/ui/KpiIcons";
import { formatCompactNumber, formatCurrency, formatCurrencyCompact, formatNumber, formatPercent } from "@/lib/format";
import { GLOSSARY } from "@/lib/glossary";
import { lastNDays } from "@/lib/dates";
import type { DateRange } from "@/lib/types";
import type { CampaignOverlapReport, OverlapEntityRow, OverlapLevel } from "@/lib/reports/campaign-overlap";

// Incremental Reach % is the positive framing of the same number (100 − Overlap %) —
// high incremental = good (unique audience), so high = green here, unlike overlap's old framing.
function incrementalCellClass(pct: number): string {
  if (pct > 60) return "text-green-700";
  if (pct < 10) return "text-red-600 font-semibold";
  if (pct < 30) return "text-amber-600";
  return "";
}

const LEVELS: { key: OverlapLevel; label: string }[] = [
  { key: "campaign", label: "Campaign" },
  { key: "adset", label: "Adset" },
  { key: "ad", label: "Ad" },
];

export default function CampaignOverlapPage() {
  const { selectedAccountId } = useAccount();
  const [range, setRange] = useState<DateRange | null>(null);
  const [level, setLevel] = useState<OverlapLevel>("campaign");
  const [topN, setTopN] = useState(15);
  // [PM ENHANCEMENT] — bump to re-run the fetch from the error banner's "Try again"
  const [retryKey, setRetryKey] = useState(0);
  const { loading, isInitialLoad, progress, data, error, run, cancel } = useStreamingReport<CampaignOverlapReport>();

  useEffect(() => {
    if (!selectedAccountId || !range) return;
    const params = new URLSearchParams({
      accountId: selectedAccountId,
      since: range.since,
      until: range.until,
      level,
      topN: String(topN),
    });
    run(`/api/reports/campaign-overlap?${params}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, range, level, topN, retryKey]);

  const entityLabel = level === "campaign" ? "Campaign" : level === "adset" ? "Adset" : "Ad";

  const columns: DataTableColumn<OverlapEntityRow>[] = useMemo(() => [
    { key: "name", header: entityLabel, accessor: (r) => r.name },
    { key: "reach", header: "Reach", help: GLOSSARY.reach, accessor: (r) => r.reach, align: "right", render: (r) => formatCompactNumber(r.reach) },
    { key: "spend", header: "Spend", help: GLOSSARY.spend, accessor: (r) => r.spend, align: "right", render: (r) => formatCurrency(r.spend) },
    { key: "cpmr", header: "CPMR", help: GLOSSARY.cpmr, accessor: (r) => r.cpmr, align: "right", render: (r) => formatCurrency(r.cpmr) },
    {
      key: "totalAccountReach",
      header: "Total Acct Reach",
      help: "Total deduplicated unique people reached by all campaigns in this period.",
      accessor: () => data?.totalAccountReach ?? 0,
      align: "right",
      render: () => formatCompactNumber(data?.totalAccountReach ?? 0),
    },
    { key: "reachWithoutEntity", header: `Acct Reach W/O ${entityLabel}`, help: `What total account reach would be if this ${entityLabel.toLowerCase()} didn't exist.`, accessor: (r) => r.reachWithoutEntity, align: "right", render: (r) => formatCompactNumber(r.reachWithoutEntity) },
    { key: "uniqueContribution", header: "Incremental Reach", help: GLOSSARY.uniqueContribution, accessor: (r) => r.uniqueContribution, align: "right", render: (r) => formatCompactNumber(r.uniqueContribution) },
    {
      key: "incrementalPct",
      header: "Incremental Reach %",
      help: "What % of this entity's reach is truly unique — reached by no other campaign. Higher is better.",
      accessor: (r) => 100 - r.overlapPct,
      align: "right",
      cellClass: (r) => incrementalCellClass(100 - r.overlapPct),
      render: (r) => formatPercent(100 - r.overlapPct),
    },
  ], [entityLabel, data?.totalAccountReach]);

  const chartData = useMemo(() => {
    const entities = data?.entities ?? [];
    const names = entities.map((e) => e.name);
    // Strip the longest common prefix so Y-axis labels show the differentiating suffix
    let prefix = names[0] ?? "";
    for (const n of names) {
      while (prefix && !n.startsWith(prefix)) prefix = prefix.slice(0, -1);
    }
    const strip = prefix.length > 8 ? prefix : "";
    return entities
      .map((e) => ({
        name: strip ? e.name.slice(strip.length).replace(/^[_\s]+/, "") : e.name,
        unique: e.uniqueContribution,
        overlap: Math.max(0, e.reach - e.uniqueContribution),
      }))
      .sort((a, b) => {
        const aPct = a.overlap / (a.unique + a.overlap || 1);
        const bPct = b.overlap / (b.unique + b.overlap || 1);
        return bPct - aPct; // worst overlap first
      });
  }, [data]);

  const insights = useMemo(() => {
    if (!data) return [];
    return overlapInsights(data.totalAccountReach, data.entities, level);
  }, [data, level]);

  const sumOfReaches = useMemo(
    () => (data?.entities ?? []).reduce((sum, e) => sum + e.reach, 0),
    [data]
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Campaign & Adset Overlap</h1>
          <p className="mt-1 text-sm text-slate-500">Discover which campaigns compete for the same audience vs. reaching unique people.</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* [PM ENHANCEMENT] — plain-language explainer so every metric is understandable */}
      <HowToRead
        items={[
          { label: "Incremental Reach", text: "people only this campaign reaches — pause it and they're gone from your funnel." },
          { label: "Incremental Reach %", text: "what share of this campaign's audience is truly unique. High = reaching its own audience; low = mostly competing with your other campaigns for the same people." },
          { label: "Acct Reach W/O Campaign", text: "what your total account reach would be if this campaign didn't exist." },
          { label: "Sum of All Reaches vs Total Account Reach", text: "the gap between them is audience counted twice across campaigns — your overlap, made visible." },
          { label: "The chart", text: "blue is audience unique to that campaign; orange is audience it shares with the rest of the account." },
        ]}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-slate-200 bg-white p-0.5">
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
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Top N
          <input
            type="number"
            min={1}
            max={50}
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value) || 15)}
            className="w-16 rounded-md border border-slate-200 px-2 py-1 text-sm"
          />
        </label>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => setRetryKey((k) => k + 1)} />}
      {loading && !progress && <FetchingState />}
      {loading && progress && (
        <div className="mt-4">
          <ProgressIndicator current={progress.current} total={progress.total} label={progress.label} onCancel={cancel} />
        </div>
      )}

      {!range && <EmptyState title="Select a date range" description="Choose a period above to load this report." />}

      {range && (
        <div className="animate-fade-in">
          <div className={`transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Total Account Reach"
                value={data ? formatCompactNumber(data.totalAccountReach) : "—"}
                title={data ? formatNumber(data.totalAccountReach) : undefined}
                sublabel="deduplicated"
                help={GLOSSARY.reach}
                loading={isInitialLoad}
                icon={<ReachIcon />}
                iconColor="bg-blue-50 text-blue-600"
                accentColor="border-l-blue-500"
              />
              <SummaryCard
                label="Sum of All Reaches"
                value={data ? formatCompactNumber(sumOfReaches) : "—"}
                title={data ? formatNumber(sumOfReaches) : undefined}
                sublabel={data ? `${formatPercent((sumOfReaches / (data.totalAccountReach || 1) - 1) * 100)} overlap gap` : "non-deduplicated"}
                help="Adding up every entity's reach without deduplication — the gap vs. Total Account Reach is audience double-counted across entities."
                loading={isInitialLoad}
                icon={<CountIcon />}
                iconColor="bg-orange-50 text-orange-600"
                accentColor="border-l-orange-500"
              />
              <SummaryCard
                label="Total Spend"
                value={data ? formatCurrencyCompact(data.totalSpend) : "—"}
                title={data ? formatCurrency(data.totalSpend) : undefined}
                help={GLOSSARY.spend}
                loading={isInitialLoad}
                icon={<SpendIcon />}
                iconColor="bg-emerald-50 text-emerald-600"
                accentColor="border-l-emerald-500"
              />
              <SummaryCard
                label={`# ${entityLabel}s`}
                value={data ? formatNumber(data.entityCount) : "—"}
                loading={isInitialLoad}
                icon={<CountIcon />}
                iconColor="bg-amber-50 text-amber-600"
                accentColor="border-l-amber-500"
              />
            </div>

            <ReportSummary insights={insights} loading={isInitialLoad} />

            {(isInitialLoad || chartData.length > 0) && (
              <div className="mt-6 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-800">Unique vs. overlapping reach</h2>
                <p className="mb-4 mt-0.5 text-xs text-slate-400">
                  Blue = audience only this {entityLabel.toLowerCase()} reached; grey = audience it shares with the rest of the account.
                </p>
                {isInitialLoad ? (
                  <ChartSkeleton />
                ) : (
                  <HorizontalBar
                    data={chartData}
                    categoryKey="name"
                    stacked
                    series={[
                      { key: "unique", label: "Unique", color: "#2563EB" },
                      { key: "overlap", label: "Overlap", color: "#F97316" },
                    ]}
                  />
                )}
              </div>
            )}

            <div className="mt-6">
              <DataTable
                columns={columns}
                rows={data?.entities ?? []}
                loading={isInitialLoad}
                filename={`${level}-overlap`}
                defaultSortKey="incrementalPct"
                defaultSortDir="desc"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
