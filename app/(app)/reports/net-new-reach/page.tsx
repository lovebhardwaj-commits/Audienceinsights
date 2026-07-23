"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "@/components/providers/AccountProvider";
import { useStreamingReport } from "@/lib/hooks/useStreamingReport";
import { useReportRange } from "@/lib/hooks/useReportRange";
import { evictCached } from "@/lib/report-cache";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { DualAxisChart } from "@/components/charts/DualAxisChart";
import { FindingsStrip } from "@/components/ui/FindingsStrip";
import { netNewFindings } from "@/lib/findings";
import { EmptyState } from "@/components/ui/EmptyState";
import { FetchingState } from "@/components/ui/FetchingState";
import { FreshnessStamp } from "@/components/ui/FreshnessStamp";
import { HowToRead } from "@/components/ui/HowToRead";
import { formatCompactNumber, formatCurrency, formatCurrencyCompact, formatPercent } from "@/lib/format";
import { GLOSSARY } from "@/lib/glossary";

import type { RollingReachReport } from "@/lib/reports/rolling-reach";
import type { NetNewReachReport } from "@/lib/reports/net-new-reach";

type WindowMode = "expanding" | "sliding";

interface DisplayRow {
  label: string;
  monthStart: string;
  isolatedReach: number;
  frequency: number;
  windowReach: number;
  windowReachLabel: string;
  netNewReach: number;
  netNewPct: number;
  spend: number;
  cpmr: number;
  costPer1kNetNew: number;
}

const LOOKBACK_OPTIONS = [90, 180, 365];

export default function NetNewReachPage() {
  const { selectedAccountId } = useAccount();
  const [range, setRange] = useReportRange("net-new-reach", 3);
  const [mode, setMode] = useState<WindowMode>("sliding");
  const [lookbackDays, setLookbackDays] = useState(90);
  const currentUrlRef = useRef<string | null>(null);

  const expanding = useStreamingReport<RollingReachReport>();
  const sliding = useStreamingReport<NetNewReachReport>();
  const active = mode === "expanding" ? expanding : sliding;

  useEffect(() => {
    if (!selectedAccountId || !range) return;
    const params = new URLSearchParams({ accountId: selectedAccountId, since: range.since, until: range.until });
    let url: string;
    // run() already checks the client cache (lib/report-cache.ts) internally and shows
    // a cached hit instantly — do NOT evict here, or every mount/range change would
    // silently re-hit Meta and defeat the cache. Only handleRefresh should evict.
    if (mode === "expanding") {
      url = `/api/reports/rolling-reach?${params}`;
      currentUrlRef.current = url;
      expanding.run(url);
    } else {
      params.set("lookbackDays", String(lookbackDays));
      url = `/api/reports/net-new-reach?${params}`;
      currentUrlRef.current = url;
      sliding.run(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, range, mode, lookbackDays]);

  function handleRefresh() {
    if (!currentUrlRef.current) return;
    evictCached(currentUrlRef.current);
    active.run(currentUrlRef.current);
  }

  const rows: DisplayRow[] = useMemo(() => {
    if (mode === "expanding") {
      return (expanding.data?.months ?? []).map((m) => ({
        label: m.label,
        monthStart: m.monthStart,
        isolatedReach: m.isolatedReach,
        frequency: m.frequency,
        windowReach: m.cumulativeReach,
        windowReachLabel: "Cumulative Reach",
        netNewReach: m.netNewReach,
        netNewPct: m.netNewPct,
        spend: m.spend,
        cpmr: m.cpmr,
        costPer1kNetNew: m.costPer1kNetNew,
      }));
    }
    return (sliding.data?.months ?? []).map((m) => ({
      label: m.label,
      monthStart: m.monthStart,
      isolatedReach: m.isolatedReach,
      frequency: m.frequency,
      windowReach: m.windowReach,
      windowReachLabel: `${lookbackDays}-Day Window Reach`,
      netNewReach: m.netNewReach,
      netNewPct: m.netNewPct,
      spend: m.spend,
      cpmr: m.cpmr,
      costPer1kNetNew: m.costPer1kNetNew,
    }));
  }, [mode, expanding.data, sliding.data, lookbackDays]);

  const columns: DataTableColumn<DisplayRow>[] = [
    { key: "label", header: "Month", accessor: (r) => r.monthStart, render: (r) => r.label },
    { key: "isolatedReach", header: "Monthly Reach", help: GLOSSARY.reach, accessor: (r) => r.isolatedReach, align: "right", render: (r) => formatCompactNumber(r.isolatedReach) },
    {
      key: "windowReach",
      header: rows[0]?.windowReachLabel ?? "Window Reach",
      help: GLOSSARY.cumulativeReach,
      accessor: (r) => r.windowReach,
      align: "right",
      render: (r) => formatCompactNumber(r.windowReach),
    },
    { key: "netNewReach", header: "Net New Reach", help: GLOSSARY.netNew, accessor: (r) => r.netNewReach, align: "right", render: (r) => formatCompactNumber(r.netNewReach) },
    { key: "netNewPct", header: "Net New %", help: GLOSSARY.netNewPct, accessor: (r) => r.netNewPct, align: "right", render: (r) => formatPercent(r.netNewPct) },
    { key: "frequency", header: "Frequency", help: GLOSSARY.frequency, accessor: (r) => r.frequency, align: "right", render: (r) => r.frequency.toFixed(2) },
    { key: "spend", header: "Spend", help: GLOSSARY.spend, accessor: (r) => r.spend, align: "right", render: (r) => formatCurrency(r.spend) },
    { key: "cpmr", header: "CPMR", help: GLOSSARY.cpmr, accessor: (r) => r.cpmr, align: "right", render: (r) => formatCurrency(r.cpmr) },
    { key: "costPer1kNetNew", header: "Cost / 1K Net New", help: GLOSSARY.costPer1kNetNew, accessor: (r) => r.costPer1kNetNew, align: "right", render: (r) => formatCurrency(r.costPer1kNetNew) },
  ];

  const compositionData = rows.map((r) => ({
    month: r.label,
    netNewReach: r.netNewReach,
    repeatReach: Math.max(0, r.isolatedReach - r.netNewReach),
    netNewPct: r.netNewPct,
  }));
  const costData = rows.map((r) => ({ month: r.label, spend: r.spend, costPer1kNetNew: r.costPer1kNetNew }));
  const latestNetNewPct = mode === "expanding" ? expanding.data?.latestNetNewPct : sliding.data?.latestNetNewPct;
  const totalSpend = mode === "expanding" ? expanding.data?.totalSpend : sliding.data?.totalSpend;
  const totalReach = mode === "expanding"
    ? expanding.data?.totalRollingReach
    : sliding.data?.months[sliding.data.months.length - 1]?.windowReach;
  const avgCostPer1kNetNew = rows.length
    ? rows.filter((r) => r.costPer1kNetNew > 0).reduce((s, r) => s + r.costPer1kNetNew, 0) /
      Math.max(1, rows.filter((r) => r.costPer1kNetNew > 0).length)
    : undefined;

  const findingsList = useMemo(() => {
    const d = mode === "expanding" ? expanding.data : sliding.data;
    return d ? netNewFindings(d) : [];
  }, [mode, expanding.data, sliding.data]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Net New Reach</h1>
          <p className="mt-1 text-sm text-slate-500">How much of your monthly reach is genuinely new people vs. repeat exposure.</p>
          <div className="mt-1"><FreshnessStamp fetchedAt={active.fetchedAt} /></div>
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
          { label: "Net New Reach", text: "people who saw your ads this month but hadn't seen them before." },
          { label: "Expanding Window", text: "compares each month against everyone reached since the start of your selected period — answers \"how much fresh audience is left overall?\"" },
          { label: "Sliding Window", text: "compares each month against only the last 90/180/365 days — answers \"am I still finding fresh people lately?\"" },
          { label: "Monthly Reach", text: "unique people reached within that month alone." },
          { label: "Frequency", text: "average number of times each person saw your ads that month. Above ~3–4, you're paying to repeat yourself." },
          { label: "Cost / 1K Net New", text: "what you pay to put ads in front of 1,000 brand-new people. A rising line means audience fatigue." },
        ]}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-slate-200 bg-white p-0.5">
          {(["expanding", "sliding"] as WindowMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1 text-sm font-medium capitalize transition-colors ${
                mode === m ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {m === "expanding" ? "Expanding Window" : "Sliding Window"}
            </button>
          ))}
        </div>
        {mode === "sliding" && (
          <select
            value={lookbackDays}
            onChange={(e) => setLookbackDays(Number(e.target.value))}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
          >
            {LOOKBACK_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {days}-day lookback
              </option>
            ))}
          </select>
        )}
      </div>

      {range && (active.loading || !active.data) && <FetchingState />}

      {!range && <EmptyState title="Select a date range" description="Choose a period above to load this report." />}

      {range && !active.loading && active.data && (
      <div className="animate-fade-in">
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label={mode === "expanding" ? "Total Rolling Reach" : "Latest Window Reach"}
          value={totalReach !== undefined ? formatCompactNumber(totalReach) : "—"}
          title={totalReach !== undefined ? String(totalReach.toLocaleString()) : undefined}
          help={mode === "expanding" ? GLOSSARY.cumulativeReach : GLOSSARY.reach}
          sparkline={rows.map((r) => r.windowReach)}
          sparklineColor="var(--color-metric-new)"
        />
        <SummaryCard
          label="Total Spend"
          value={totalSpend !== undefined ? formatCurrencyCompact(totalSpend) : "—"}
          title={totalSpend !== undefined ? formatCurrency(totalSpend) : undefined}
          help={GLOSSARY.spend}
          sparkline={rows.map((r) => r.spend)}
        />
        <SummaryCard
          label="Latest Net New %"
          value={latestNetNewPct !== undefined ? formatPercent(latestNetNewPct) : "—"}
          help={GLOSSARY.netNewPct}
          sparkline={rows.map((r) => r.netNewPct)}
          sparklineColor="var(--color-metric-new)"
        />
        <SummaryCard
          label="Avg Cost / 1K Net New"
          value={avgCostPer1kNetNew !== undefined ? formatCurrencyCompact(avgCostPer1kNetNew) : "—"}
          title={avgCostPer1kNetNew !== undefined ? formatCurrency(avgCostPer1kNetNew) : undefined}
          help={GLOSSARY.costPer1kNetNew}
          sparkline={rows.map((r) => r.costPer1kNetNew)}
          sparklineColor="var(--color-metric-repeat)"
        />
      </div>

      <div className="mt-4">
        <FindingsStrip findings={findingsList} />
      </div>

      <div className="mt-6 rounded-xl border border-hairline bg-surface-card p-5">
        <h2 className="text-sm font-semibold text-slate-800">Reach composition analysis</h2>
        <p className="mb-4 mt-0.5 text-xs text-slate-400">
          {mode === "expanding"
            ? "Each month's reach split into net new people vs. people already reached before — the line tracks % net new."
            : `Each month's reach split into people new vs. anyone reached in the prior ${lookbackDays} days — the line tracks % net new.`}
        </p>
        <DualAxisChart
          data={compositionData}
          xKey="month"
          bars={[
            { key: "repeatReach", label: "Reached Previously", color: "var(--color-metric-repeat)" },
            { key: "netNewReach", label: "Net New Reach", color: "var(--color-metric-new)" },
          ]}
          lines={[{ key: "netNewPct", label: "% Net New", color: "#eda100" }]}
          barFormat="compact"
          lineFormat="percent"
          xTitle="Month"
          yTitle="Reach (people)"
          yRightTitle="% Net New"
        />
      </div>

      <div className="mt-6 rounded-xl border border-hairline bg-surface-card p-5">
        <h2 className="text-sm font-semibold text-slate-800">Cost per 1K net new reach</h2>
        <p className="mb-4 mt-0.5 text-xs text-slate-400">Monthly spend vs. cost per thousand new people reached — a rising line means you&apos;re paying more for fresh audience.</p>
        <DualAxisChart
          data={costData}
          xKey="month"
          bars={[{ key: "spend", label: "Spend", color: "#94a3b8" }]}
          lines={[{ key: "costPer1kNetNew", label: "Cost / 1K Net New", color: "#4a3aa7" }]}
          barFormat="currencyCompact"
          lineFormat="currency"
          xTitle="Month"
          yTitle="Spend (₹)"
          yRightTitle="Cost / 1K (₹)"
          shareOfTotal={false}
        />
      </div>

      <div className="mt-6">
        <DataTable columns={columns} rows={rows} filename="net-new-reach" defaultSortKey="label" defaultSortDir="asc" />
      </div>
      </div>
      )}
    </div>
  );
}
