"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "@/components/providers/AccountProvider";
import { useDateRange } from "@/components/providers/DateRangeProvider";
import { useJsonReport } from "@/lib/hooks/useJsonReport";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { StackedBar } from "@/components/charts/StackedBar";
import { LineChart } from "@/components/charts/LineChart";
import { HorizontalBar } from "@/components/charts/HorizontalBar";
import { ReportSummary } from "@/components/ui/ReportSummary";
import { EmptyState } from "@/components/ui/EmptyState";
import { FetchingState } from "@/components/ui/FetchingState";
import { FreshnessStamp } from "@/components/ui/FreshnessStamp";
import { HowToRead } from "@/components/ui/HowToRead";
import { SEGMENT_COLORS, SEGMENT_LABELS, MIN_USEFUL_MONTHS } from "@/lib/constants";
import { ReachIcon, SpendIcon, TrendUpIcon, PercentIcon } from "@/components/ui/KpiIcons";
import { formatCompactNumber, formatCurrency, formatCurrencyCompact, formatNumber, formatPercent, formatShortDate } from "@/lib/format";
import { audienceSegmentInsights, creativeSegmentInsights } from "@/lib/insights";
import { GLOSSARY } from "@/lib/glossary";
import { lastNMonths, isPartialWeek } from "@/lib/dates";
import type { DateRange } from "@/lib/types";
import type { AudienceSegmentsReport } from "@/lib/reports/audience-segments";
import type { CreativeSegmentsReport, EntityLevel, EntitySegmentRow } from "@/lib/reports/creative-segments";

interface WeekTableRow {
  weekStart: string;
  weekEnd: string;
  prospectingReach: number;
  prospectingSpend: number;
  prospectingCpmr: number;
  prospectingPurchases: number;
  engagedReach: number;
  engagedSpend: number;
  engagedCpmr: number;
  engagedPurchases: number;
  existingReach: number;
  existingSpend: number;
  existingCpmr: number;
  existingPurchases: number;
}

const columns: DataTableColumn<WeekTableRow>[] = [
  { key: "week", header: "Week", accessor: (r) => r.weekStart, render: (r) => formatShortDate(r.weekStart) },
  { key: "prospectingReach", header: "New Reach", help: GLOSSARY.prospecting, accessor: (r) => r.prospectingReach, align: "right", render: (r) => formatCompactNumber(r.prospectingReach) },
  { key: "prospectingSpend", header: "New Spend", accessor: (r) => r.prospectingSpend, align: "right", render: (r) => formatCurrency(r.prospectingSpend) },
  { key: "prospectingCpmr", header: "New CPMR", help: GLOSSARY.cpmr, accessor: (r) => r.prospectingCpmr, align: "right", render: (r) => formatCurrency(r.prospectingCpmr) },
  { key: "prospectingPurchases", header: "New Purchases", help: GLOSSARY.cpp, accessor: (r) => r.prospectingPurchases, align: "right", render: (r) => formatNumber(r.prospectingPurchases) },
  { key: "engagedReach", header: "Engaged Reach", help: GLOSSARY.engaged, accessor: (r) => r.engagedReach, align: "right", render: (r) => formatCompactNumber(r.engagedReach) },
  { key: "engagedSpend", header: "Engaged Spend", accessor: (r) => r.engagedSpend, align: "right", render: (r) => formatCurrency(r.engagedSpend) },
  { key: "engagedCpmr", header: "Engaged CPMR", help: GLOSSARY.cpmr, accessor: (r) => r.engagedCpmr, align: "right", render: (r) => formatCurrency(r.engagedCpmr) },
  { key: "engagedPurchases", header: "Engaged Purchases", accessor: (r) => r.engagedPurchases, align: "right", render: (r) => formatNumber(r.engagedPurchases) },
  { key: "existingReach", header: "Existing Reach", help: GLOSSARY.existing, accessor: (r) => r.existingReach, align: "right", render: (r) => formatCompactNumber(r.existingReach) },
  { key: "existingSpend", header: "Existing Spend", accessor: (r) => r.existingSpend, align: "right", render: (r) => formatCurrency(r.existingSpend) },
  { key: "existingCpmr", header: "Existing CPMR", help: GLOSSARY.cpmr, accessor: (r) => r.existingCpmr, align: "right", render: (r) => formatCurrency(r.existingCpmr) },
  { key: "existingPurchases", header: "Existing Purchases", accessor: (r) => r.existingPurchases, align: "right", render: (r) => formatNumber(r.existingPurchases) },
];

type ViewLevel = "account" | EntityLevel;
const VIEW_LEVELS: { key: ViewLevel; label: string }[] = [
  { key: "account", label: "Account" },
  { key: "campaign", label: "Campaign" },
  { key: "adset", label: "Adset" },
  { key: "ad", label: "Ad" },
];

function newPctCellClass(row: EntitySegmentRow): string {
  if (row.prospectingReachPct >= 70) return "text-green-700 font-semibold";
  if (row.prospectingReachPct < 40) return "text-red-600";
  return "text-amber-600";
}

export default function AudienceSegmentsPage() {
  const { selectedAccountId } = useAccount();
  const { range, setRange, applyInitialMonths } = useDateRange();
  useEffect(() => { applyInitialMonths(MIN_USEFUL_MONTHS["audience-segments"]); }, [applyInitialMonths]);
  const [viewLevel, setViewLevel] = useState<ViewLevel>("account");
  // [PM ENHANCEMENT] — bump to re-run the fetch from the error banner's "Try again"
  const [retryKey, setRetryKey] = useState(0);
  const accountReport = useJsonReport<{ data: AudienceSegmentsReport }>();
  const entityReport = useJsonReport<{ data: CreativeSegmentsReport }>();

  const isEntityView = viewLevel !== "account";
  const loading = isEntityView ? entityReport.loading : accountReport.loading;
  const isInitialLoad = isEntityView ? entityReport.isInitialLoad : accountReport.isInitialLoad;
  const error = isEntityView ? entityReport.error : accountReport.error;
  const errorCode = isEntityView ? entityReport.errorCode : accountReport.errorCode;
  const fetchedAt = isEntityView ? entityReport.fetchedAt : accountReport.fetchedAt;

  useEffect(() => {
    if (!selectedAccountId || !range) return;
    const params = new URLSearchParams({ accountId: selectedAccountId, since: range.since, until: range.until });
    if (viewLevel === "account") {
      accountReport.run(`/api/reports/audience-segments?${params}`);
    } else {
      params.set("level", viewLevel);
      entityReport.run(`/api/reports/creative-segments?${params}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, range, viewLevel, retryKey]);

  const report = accountReport.data?.data;

  const insights = useMemo(() => report ? audienceSegmentInsights(report) : [], [report]);

  const tableRows: WeekTableRow[] = useMemo(() => {
    if (!report) return [];
    return report.weeks.map((week) => ({
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      prospectingReach: week.segments.prospecting.reach,
      prospectingSpend: week.segments.prospecting.spend,
      prospectingCpmr: week.segments.prospecting.cpmr,
      prospectingPurchases: week.segments.prospecting.purchases,
      engagedReach: week.segments.engaged.reach,
      engagedSpend: week.segments.engaged.spend,
      engagedCpmr: week.segments.engaged.cpmr,
      engagedPurchases: week.segments.engaged.purchases,
      existingReach: week.segments.existing.reach,
      existingSpend: week.segments.existing.spend,
      existingCpmr: week.segments.existing.cpmr,
      existingPurchases: week.segments.existing.purchases,
    }));
  }, [report]);

  // Trailing partial week (D6) — faded in the spend chart, labeled everywhere.
  const partialWeekIndex = useMemo(() => {
    const i = (report?.weeks ?? []).findIndex((w) => isPartialWeek(w.weekStart, w.weekEnd));
    return i >= 0 ? i : undefined;
  }, [report]);

  const chartData = useMemo(() => {
    if (!report) return [];
    return report.weeks.map((week) => ({
      week: isPartialWeek(week.weekStart, week.weekEnd) ? `${formatShortDate(week.weekStart)} (partial)` : formatShortDate(week.weekStart),
      prospecting: week.segments.prospecting.spendPct,
      engaged: week.segments.engaged.spendPct,
      existing: week.segments.existing.spendPct,
      unknown: week.segments.unknown.spendPct,
    }));
  }, [report]);

  const cpmrTrendData = useMemo(() => {
    if (!report) return [];
    return report.weeks.map((week) => ({
      week: isPartialWeek(week.weekStart, week.weekEnd) ? `${formatShortDate(week.weekStart)} (partial)` : formatShortDate(week.weekStart),
      prospectingCpmr: week.segments.prospecting.cpmr,
      engagedCpmr: week.segments.engaged.cpmr,
      existingCpmr: week.segments.existing.cpmr,
    }));
  }, [report]);

  const entities = entityReport.data?.data.entities ?? [];
  const entityLabel = viewLevel === "campaign" ? "Campaign" : viewLevel === "adset" ? "Adset" : "Ad";

  const entitySorted = useMemo(
    () => [...entities].sort((a, b) => b.prospectingReachPct - a.prospectingReachPct),
    [entities]
  );
  const entityBest = entitySorted[0];
  const entityWorst = entitySorted[entitySorted.length - 1];
  const entityHighNewCount = entities.filter((e) => e.prospectingReachPct >= 70).length;

  const entityChartData = useMemo(
    () =>
      [...entities]
        .sort((a, b) => b.prospectingReachPct - a.prospectingReachPct)
        .slice(0, 25)
        .map((e) => ({ name: e.name, New: e.prospectingReachPct, Engaged: e.engagedReachPct, Existing: e.existingReachPct })),
    [entities]
  );

  const entityInsights = useMemo(() => creativeSegmentInsights(entities, entityLabel), [entities, entityLabel]);

  const entityColumns: DataTableColumn<EntitySegmentRow>[] = useMemo(() => [
    { key: "name", header: entityLabel, accessor: (r) => r.name },
    { key: "totalReach", header: "Total Reach", help: GLOSSARY.reach, accessor: (r) => r.totalReach, align: "right", render: (r) => formatCompactNumber(r.totalReach) },
    { key: "totalSpend", header: "Total Spend", help: GLOSSARY.spend, accessor: (r) => r.totalSpend, align: "right", render: (r) => formatCurrency(r.totalSpend) },
    { key: "totalPurchases", header: "Purchases", help: GLOSSARY.cpp, accessor: (r) => r.totalPurchases, align: "right", render: (r) => formatNumber(r.totalPurchases) },
    { key: "prospectingReachPct", header: "New Reach %", help: GLOSSARY.newPct, accessor: (r) => r.prospectingReachPct, align: "right", cellClass: newPctCellClass, render: (r) => formatPercent(r.prospectingReachPct) },
    { key: "prospectingPurchases", header: "New Purchases", accessor: (r) => r.prospectingPurchases, align: "right", render: (r) => formatNumber(r.prospectingPurchases) },
    { key: "prospectingCpa", header: "New CPA", help: GLOSSARY.cpp, accessor: (r) => r.prospectingCpa, align: "right", render: (r) => (r.prospectingCpa > 0 ? formatCurrency(r.prospectingCpa) : "—") },
    { key: "engagedReach", header: "Engaged Reach", accessor: (r) => r.engagedReach, align: "right", render: (r) => formatCompactNumber(r.engagedReach) },
    { key: "existingReach", header: "Existing Reach", accessor: (r) => r.existingReach, align: "right", render: (r) => formatCompactNumber(r.existingReach) },
  ], [entityLabel]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">User Segments</h1>
          <p className="mt-1 text-sm text-slate-500">Weekly breakdown of who you're reaching — new vs. engaged vs. existing customers.</p>
          <div className="mt-1"><FreshnessStamp fetchedAt={fetchedAt} /></div>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* [PM ENHANCEMENT] — plain-language explainer so every metric is understandable */}
      <HowToRead
        items={[
          { label: "New Audience", text: "people who've never interacted with your brand — pure prospecting." },
          { label: "Engaged", text: "people who interacted (visited your site, watched a video) but haven't bought yet." },
          { label: "Existing Customers", text: "people already on your customer list or who have purchased." },
          { label: "CPMR", text: "cost to reach 1,000 people in a segment. A rising New CPMR means prospecting is getting more expensive." },
          { label: "The charts", text: "the stacked bars show where each week's budget actually went; the lines below track what reaching each segment costs over time." },
        ]}
      />

      <div className="mt-3 flex rounded-md border border-slate-200 bg-white p-0.5 w-fit">
        {VIEW_LEVELS.map((l) => (
          <button
            key={l.key}
            onClick={() => setViewLevel(l.key)}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              viewLevel === l.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {loading && <FetchingState />}

      {!range && <EmptyState title="Select a date range" description="Choose a period above to load this report." />}

      {range && isEntityView && (
        <div className="animate-fade-in">
          <div className={`mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <SummaryCard label={`Best Prospecting ${entityLabel}`} value={entityBest ? formatPercent(entityBest.prospectingReachPct) : "—"} sublabel={entityBest?.name?.slice(0, 36)} loading={isInitialLoad} iconColor="bg-blue-50 text-blue-600" accentColor="border-l-blue-500" />
            <SummaryCard label={`Worst Prospecting ${entityLabel}`} value={entityWorst && entityWorst !== entityBest ? formatPercent(entityWorst.prospectingReachPct) : "—"} sublabel={entityWorst && entityWorst !== entityBest ? entityWorst.name.slice(0, 36) : undefined} loading={isInitialLoad} iconColor="bg-red-50 text-red-500" accentColor="border-l-red-400" />
            <SummaryCard label={`${entityLabel}s with >70% New`} value={entityReport.data ? `${entityHighNewCount} of ${entities.length}` : "—"} sublabel={entityHighNewCount === 0 ? "none are strong prospectors" : "strong prospectors"} loading={isInitialLoad} iconColor="bg-emerald-50 text-emerald-600" accentColor="border-l-emerald-500" />
          </div>
          <div className={`transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <ReportSummary insights={entityInsights} loading={isInitialLoad} />
            {(isInitialLoad || entityChartData.length > 0) && (
              <div className="mt-6 rounded-xl border border-hairline bg-surface-card p-5">
                <h2 className="text-sm font-semibold text-slate-800">Audience segment composition by {entityLabel.toLowerCase()}</h2>
                <p className="mb-4 mt-0.5 text-xs text-slate-400">Each bar = 100% of that {entityLabel.toLowerCase()}&apos;s reach. Sorted by new % descending.</p>
                {isInitialLoad ? <ChartSkeleton /> : (
                  <HorizontalBar data={entityChartData} categoryKey="name" stacked valueFormat="percent" xTitle="% of reach" series={[
                    { key: "New", label: "New Audience", color: SEGMENT_COLORS.prospecting },
                    { key: "Engaged", label: "Engaged", color: SEGMENT_COLORS.engaged },
                    { key: "Existing", label: "Existing Customers", color: SEGMENT_COLORS.existing },
                  ]} />
                )}
              </div>
            )}
            <div className="mt-6">
              <DataTable columns={entityColumns} rows={entities} loading={isInitialLoad} filename={`${viewLevel}-segments`} defaultSortKey="prospectingReachPct" defaultSortDir="desc" />
            </div>
          </div>
        </div>
      )}

      {range && !isEntityView && (
      <div className="animate-fade-in">
      <div className={`mt-4 grid grid-cols-2 gap-3 transition-opacity duration-200 sm:grid-cols-4 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
        <SummaryCard
          label="Total Reach"
          value={report ? formatCompactNumber(report.totalReach) : "—"}
          title={report ? formatNumber(report.totalReach) : undefined}
          help={GLOSSARY.reach}
          loading={isInitialLoad}
          icon={<ReachIcon />}
          iconColor="bg-blue-50 text-blue-600"
          accentColor="border-l-blue-500"
        />
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
          label="Total Purchases"
          value={report ? formatNumber(report.totalPurchases) : "—"}
          sublabel="all segments"
          help={GLOSSARY.cpp}
          loading={isInitialLoad}
          icon={<TrendUpIcon />}
          iconColor="bg-violet-50 text-violet-600"
          accentColor="border-l-violet-500"
        />
        <SummaryCard
          label="New Audience"
          value={report ? formatPercent(report.totals.prospecting.reachPct) : "—"}
          sublabel="of total reach"
          help={GLOSSARY.prospecting}
          loading={isInitialLoad}
          icon={<PercentIcon />}
          iconColor="bg-blue-50 text-blue-600"
          accentColor="border-l-blue-500"
        />
      </div>

      <div className={`mt-4 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
        <ReportSummary insights={insights} loading={isInitialLoad} />
      </div>

      <div className={`mt-6 rounded-xl border border-hairline bg-surface-card p-5 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
        <h2 className="text-sm font-semibold text-slate-800">Spend distribution by audience segment</h2>
        <p className="mb-4 mt-0.5 text-xs text-slate-400">Weekly share of budget going to new vs. engaged vs. existing audiences.</p>
        {isInitialLoad ? (
          <ChartSkeleton height={360} />
        ) : (
          <StackedBar
            data={chartData}
            xKey="week"
            unit="%"
            height={360}
            xTitle="Week starting"
            yTitle="% of spend"
            partialIndex={partialWeekIndex}
            referenceLines={[{ y: 30, label: "30% new-audience target", color: "#64748b" }]}
            series={[
              { key: "prospecting", label: SEGMENT_LABELS.prospecting, color: SEGMENT_COLORS.prospecting },
              { key: "engaged", label: SEGMENT_LABELS.engaged, color: SEGMENT_COLORS.engaged },
              { key: "existing", label: SEGMENT_LABELS.existing, color: SEGMENT_COLORS.existing },
              { key: "unknown", label: SEGMENT_LABELS.unknown, color: SEGMENT_COLORS.unknown },
            ]}
          />
        )}
      </div>

      <div className={`mt-6 rounded-xl border border-hairline bg-surface-card p-5 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
        <h2 className="text-sm font-semibold text-slate-800">CPMR trend by segment</h2>
        <p className="mb-4 mt-0.5 text-xs text-slate-400">Cost per 1,000 people reached, week over week — a rising New line means prospecting is getting more expensive.</p>
        {isInitialLoad ? (
          <ChartSkeleton height={360} />
        ) : (
          <LineChart
            data={cpmrTrendData}
            xKey="week"
            height={360}
            valueFormat="currency"
            xTitle="Week starting"
            yTitle="CPMR (₹)"
            lines={[
              { key: "prospectingCpmr", label: "New CPMR", color: SEGMENT_COLORS.prospecting },
              { key: "engagedCpmr", label: "Engaged CPMR", color: SEGMENT_COLORS.engaged },
              { key: "existingCpmr", label: "Existing CPMR", color: SEGMENT_COLORS.existing },
            ]}
          />
        )}
      </div>

      <div className="mt-6">
        <DataTable columns={columns} rows={tableRows} loading={isInitialLoad} filename="audience-segments" defaultSortKey="week" defaultSortDir="asc" />
      </div>
      </div>
      )}
    </div>
  );
}

