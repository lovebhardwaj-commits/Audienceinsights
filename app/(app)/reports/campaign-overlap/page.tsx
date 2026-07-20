"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "@/components/providers/AccountProvider";
import { useStreamingReport } from "@/lib/hooks/useStreamingReport";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { HorizontalBar } from "@/components/charts/HorizontalBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { FetchingState } from "@/components/ui/FetchingState";
import { FreshnessStamp } from "@/components/ui/FreshnessStamp";
import { HowToRead } from "@/components/ui/HowToRead";
import { FindingsStrip } from "@/components/ui/FindingsStrip";
import { overlapFindings } from "@/lib/findings";
import { ReachIcon, SpendIcon, CountIcon } from "@/components/ui/KpiIcons";
import { formatCompactNumber, formatCurrency, formatCurrencyCompact, formatNumber, formatPercent, formatEntityLabels } from "@/lib/format";
import { GLOSSARY } from "@/lib/glossary";
import { evictCached } from "@/lib/report-cache";
import { useReportRange } from "@/lib/hooks/useReportRange";
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

// Single source of truth for the overlap chart's series — the subtitle words and the
// rendered bars both read from this, so they can never contradict again (D8).
// Colors follow the metric-identity law: Unique/New = blue, Overlap/Repeat = orange.
const OVERLAP_SERIES: { key: string; label: string; color: string }[] = [
  { key: "unique", label: "Unique", color: "#2563EB" },
  { key: "overlap", label: "Overlap", color: "#EA580C" },
];

/** Maps a series hex to the plain color word used in prose, so copy stays truthful. */
function colorWord(hex: string): string {
  const h = hex.toLowerCase();
  if (h === "#2563eb") return "Blue";
  if (h === "#ea580c" || h === "#f97316") return "Orange";
  return "This color";
}

export default function CampaignOverlapPage() {
  const { selectedAccountId } = useAccount();
  const [range, setRange] = useReportRange("campaign-overlap", 1);
  const [level, setLevel] = useState<OverlapLevel>("campaign");
  const [topN, setTopN] = useState(15);
  const [retryKey, setRetryKey] = useState(0);
  const { loading, isInitialLoad, data, fetchedAt, run } = useStreamingReport<CampaignOverlapReport>();
  const currentUrlRef = useRef<string | null>(null);

  const liveEntities: OverlapEntityRow[] = useMemo(
    () => data?.entities ?? [],
    [data]
  );
  const hasRows = liveEntities.length > 0;

  useEffect(() => {
    if (!selectedAccountId || !range) return;
    const params = new URLSearchParams({
      accountId: selectedAccountId,
      since: range.since,
      until: range.until,
      level,
      topN: String(topN),
    });
    const url = `/api/reports/campaign-overlap?${params}`;
    currentUrlRef.current = url;
    run(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, range, level, topN, retryKey]);

  function handleRefresh() {
    if (currentUrlRef.current) evictCached(currentUrlRef.current);
    setRetryKey((k) => k + 1);
  }

  const entityLabel = level === "campaign" ? "Campaign" : level === "adset" ? "Adset" : "Ad";

  // Shared label engine (Part 5 / 7.2) — strip the common prefix once, middle-ellipsize the rest.
  const entityLabels = useMemo(
    () => formatEntityLabels(liveEntities.map((e) => e.name), 30),
    [liveEntities]
  );
  const labelByName = useMemo(() => {
    const m: Record<string, string> = {};
    liveEntities.forEach((e, i) => { m[e.name] = entityLabels.labels[i] ?? e.name; });
    return m;
  }, [liveEntities, entityLabels]);
  // Reverse map so the chart tooltip can show the full name behind a stripped label (§3.3).
  const fullLabelByDisplay = useMemo(() => {
    const m: Record<string, string> = {};
    liveEntities.forEach((e, i) => { m[entityLabels.labels[i] ?? e.name] = e.name; });
    return m;
  }, [liveEntities, entityLabels]);

  const columns: DataTableColumn<OverlapEntityRow>[] = useMemo(() => [
    { key: "name", header: entityLabel, accessor: (r) => r.name, render: (r) => labelByName[r.name] ?? r.name },
    { key: "reach", header: "Reach", help: GLOSSARY.reach, accessor: (r) => r.reach, align: "right", render: (r) => formatCompactNumber(r.reach) },
    { key: "spend", header: "Spend", help: GLOSSARY.spend, accessor: (r) => r.spend, align: "right", render: (r) => formatCurrency(r.spend) },
    {
      // 7.2 — money wasted on overlap = spend × overlap%. Default sort so the biggest ₹ waste is on top.
      key: "moneyOnOverlap",
      header: "₹ on Overlap",
      help: "Spend that went to people this entity shares with others — spend × overlap %. Rank by this to find the biggest waste.",
      accessor: (r) => r.spend * (r.overlapPct / 100),
      align: "right",
      cellClass: (r) => (r.overlapPct > 75 ? "text-red-600 font-semibold" : r.overlapPct > 50 ? "text-amber-600" : ""),
      render: (r) => formatCurrencyCompact(r.spend * (r.overlapPct / 100)),
    },
    { key: "cpmr", header: "CPMR", help: GLOSSARY.cpmr, accessor: (r) => r.cpmr, align: "right", render: (r) => formatCurrency(r.cpmr) },
    { key: "uniqueContribution", header: "Unique Reach", help: GLOSSARY.uniqueContribution, accessor: (r) => r.uniqueContribution, align: "right", render: (r) => formatCompactNumber(r.uniqueContribution) },
    {
      key: "incrementalPct",
      header: "Unique %",
      help: "What % of this entity's reach is truly unique — reached by no other campaign. Higher is better.",
      accessor: (r) => 100 - r.overlapPct,
      align: "right",
      cellClass: (r) => incrementalCellClass(100 - r.overlapPct),
      render: (r) => formatPercent(100 - r.overlapPct),
    },
  ], [entityLabel, labelByName]);

  const chartData = useMemo(() => {
    return liveEntities
      .map((e) => ({
        name: labelByName[e.name] ?? e.name,
        unique: e.uniqueContribution,
        overlap: Math.max(0, e.reach - e.uniqueContribution),
      }))
      .sort((a, b) => (b.unique + b.overlap) - (a.unique + a.overlap));
  }, [liveEntities, labelByName]);

  const findingsList = useMemo(
    () => (data ? overlapFindings(data, entityLabels.prefix) : []),
    [data, entityLabels.prefix]
  );

  const sumOfReaches = useMemo(
    () => liveEntities.reduce((sum, e) => sum + e.reach, 0),
    [liveEntities]
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Campaign & Adset Overlap</h1>
          <p className="mt-1 text-sm text-slate-500">Discover which campaigns compete for the same audience vs. reaching unique people.</p>
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

      <HowToRead
        items={[
          { label: "Reach", text: "total unique people who saw this campaign's ads in the selected period." },
          { label: "Spend", text: "total amount spent by this campaign in the period." },
          { label: "₹ on Overlap", text: "estimated spend wasted on people already reached by your other campaigns — calculated as Spend × overlap %. Sorted by this column by default. Red = over 75% overlap, amber = over 50%." },
          { label: "CPMR", text: "Cost Per 1,000 people Reached. How efficiently this campaign buys unique reach. Lower = cheaper per person. Compare across campaigns to spot the most cost-efficient ones." },
          { label: "Unique Reach", text: "people ONLY this campaign reaches — no other campaign in your account touches them. Pause this campaign and these people drop out of your funnel entirely." },
          { label: "Unique %", text: "Unique Reach as a % of total reach. High % = campaign has its own audience. Low % = mostly competing with your other campaigns for the same people. Green > 60%, red < 10%." },
          { label: "The chart", text: "Blue bar = unique audience. Orange bar = audience shared with other campaigns. Sorted by total reach. Campaigns with a thin blue sliver are redundant — most of their spend overlaps." },
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

      <p className="mt-2 text-[11px] text-ink-tertiary">
        This runs ≈{topN + 2} Meta API calls (one per {entityLabel.toLowerCase()}), roughly {Math.max(1, Math.ceil(((topN + 2) * 1.3) / 60))}–{Math.ceil(((topN + 2) * 1.3) / 60) + 1} min on a cold load.
      </p>

      {(loading || (range && !data)) && <FetchingState />}

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
                value={hasRows ? formatCompactNumber(sumOfReaches) : "—"}
                title={hasRows ? formatNumber(sumOfReaches) : undefined}
                sublabel={data ? `${formatPercent((sumOfReaches / (data.totalAccountReach || 1) - 1) * 100)} overlap gap` : hasRows ? "running total…" : "non-deduplicated"}
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

            <FindingsStrip findings={findingsList} loading={loading && !hasRows} />

            {(loading || hasRows) && (
              <div className="mt-6 rounded-xl border border-hairline bg-surface-card p-5">
                <h2 className="text-sm font-semibold text-slate-800">Unique vs. overlapping reach</h2>
                {/* D8 — subtitle is generated FROM the series config, so its color words can
                    never drift from the rendered bars again. */}
                <p className="mb-4 mt-0.5 text-xs text-slate-400">
                  <span style={{ color: OVERLAP_SERIES[0].color }} className="font-semibold">{colorWord(OVERLAP_SERIES[0].color)}</span>
                  {` = audience only this ${entityLabel.toLowerCase()} reached; `}
                  <span style={{ color: OVERLAP_SERIES[1].color }} className="font-semibold">{colorWord(OVERLAP_SERIES[1].color)}</span>
                  {` = audience it shares with the rest of the account.`}
                </p>
                {entityLabels.prefix && (
                  <p className="mb-3 text-[11px] text-slate-400">
                    All names begin with <span className="font-mono font-medium text-slate-500">{entityLabels.prefix}</span>
                  </p>
                )}
                {!hasRows ? (
                  <ChartSkeleton />
                ) : (
                  <HorizontalBar
                    data={chartData}
                    categoryKey="name"
                    stacked
                    percentOfTotal
                    series={OVERLAP_SERIES}
                    xTitle="Reach (people)"
                    fullLabels={fullLabelByDisplay}
                  />
                )}
              </div>
            )}

            <div className="mt-6">
              <DataTable
                columns={columns}
                rows={liveEntities}
                loading={loading && !hasRows}
                filename={`${level}-overlap`}
                defaultSortKey="moneyOnOverlap"
                defaultSortDir="desc"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
