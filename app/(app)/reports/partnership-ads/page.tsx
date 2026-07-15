"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDateRange } from "@/components/providers/DateRangeProvider";
import { useAccount } from "@/components/providers/AccountProvider";
import { useJsonReport } from "@/lib/hooks/useJsonReport";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ChartSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { HorizontalBar } from "@/components/charts/HorizontalBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { FetchingState } from "@/components/ui/FetchingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { HowToRead } from "@/components/ui/HowToRead";
import { CHART_CHROME, CHART_INK } from "@/lib/chart-theme";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { SEGMENT_COLORS } from "@/lib/constants";
import { formatCompactNumber, formatCurrency, formatCurrencyCompact, formatNumber, formatPercent, formatShortDate } from "@/lib/format";
import { GLOSSARY } from "@/lib/glossary";
import type { DateRange } from "@/lib/types";
import type { CreatorRow, GroupMetrics, PartnershipAdRow, PartnershipReport } from "@/lib/reports/partnership-ads";

function newReachCellClass(pct: number): string {
  if (pct > 70) return "text-green-700 font-semibold";
  if (pct < 40) return "text-red-600";
  return "";
}

function newPurchaseCellClass(pct: number): string {
  if (pct > 60) return "text-green-700 font-semibold";
  if (pct < 30) return "text-red-600";
  return "";
}

interface GroupCardAccent {
  headerGradient: string;
  headerText: string;
  tileBg: string;
}

/** One head-to-head group card: 8 metric tiles under a colored gradient header. */
function GroupCard({ title, group, loading, accent }: {
  title: string;
  group: GroupMetrics | undefined;
  loading: boolean;
  accent: GroupCardAccent;
}) {
  const frequency = group && group.reach > 0 ? group.impressions / group.reach : 0;

  const tiles: Array<{ label: string; value: string; semantic?: "good" | "warn" }> = group
    ? [
        { label: "Ads", value: formatNumber(group.adCount) },
        { label: "Reach", value: formatCompactNumber(group.reach) },
        { label: "Spend", value: formatCurrencyCompact(group.spend) },
        { label: "CPMR", value: group.cpmr > 0 ? formatCurrency(group.cpmr) : "—" },
        { label: "Purchases", value: group.purchases > 0 ? formatNumber(group.purchases) : "—" },
        { label: "New CPA", value: group.newCpa > 0 ? formatCurrency(group.newCpa) : "—" },
        {
          label: `Incremental Reach (${formatPercent(group.incrementalPct, 0)})`,
          value: formatCompactNumber(group.incrementalReach),
          semantic: group.incrementalPct > 50 ? "good" : group.incrementalPct < 30 ? "warn" : undefined,
        },
        { label: "Frequency", value: frequency > 0 ? frequency.toFixed(1) + "×" : "—" },
      ]
    : [];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 shadow-[0_1px_4px_0_rgb(0,0,0,0.07)]">
      <div className={`px-5 py-3.5 ${accent.headerGradient}`}>
        <span className={`text-[11px] font-bold uppercase tracking-[0.1em] ${accent.headerText}`}>{title}</span>
      </div>
      <div className="bg-white p-5">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-lg bg-slate-50 p-3.5">
                  <Skeleton className="h-6 w-14" />
                  <Skeleton className="mt-1.5 h-3 w-10" />
                </div>
              ))
            : tiles.map((t) => (
                <div
                  key={t.label}
                  className={`rounded-lg p-3.5 ${
                    t.semantic === "good"
                      ? "bg-emerald-50"
                      : t.semantic === "warn"
                      ? "bg-amber-50"
                      : accent.tileBg
                  }`}
                >
                  <div
                    className={`text-xl font-bold tabular-nums ${
                      t.semantic === "good"
                        ? "text-emerald-700"
                        : t.semantic === "warn"
                        ? "text-amber-700"
                        : "text-slate-900"
                    }`}
                  >
                    {t.value}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-slate-400">{t.label}</div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

/** Incremental Reach Comparison — the dedicated deep-dive card between the
 *  head-to-head cards and the composition chart, per the incremental-reach spec. */
function IncrementalReachCard({ report, loading }: { report: PartnershipReport | undefined; loading: boolean }) {
  if (loading || !report) {
    return (
      <div className="mt-6 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <Skeleton className="h-4 w-48" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const rows = (g: GroupMetrics) => [
    { label: "Group Reach", value: formatCompactNumber(g.reach) },
    { label: "Acct W/O Group", value: formatCompactNumber(g.accountReachWithoutGroup) },
    { label: "Incremental", value: formatCompactNumber(g.incrementalReach) },
  ];

  return (
    <div className="mt-6 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Incremental Reach Comparison</h2>
      <p className="mt-1 text-[13px] text-slate-500">
        Total Account Reach: <span className="font-bold text-slate-900">{formatCompactNumber(report.totalAccountReach)}</span>
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { title: "Partnership", group: report.partnership },
          { title: "Normal", group: report.normal },
        ].map(({ title, group }) => (
          <div key={title} className="rounded-lg bg-slate-50 p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</div>
            {rows(group).map((r) => (
              <div key={r.label} className="flex items-center justify-between py-1 text-[13px]">
                <span className="w-[140px] shrink-0 text-xs text-slate-400">{r.label}</span>
                <span className="font-semibold tabular-nums text-slate-900">{r.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-1 text-[13px]">
              <span className="w-[140px] shrink-0 text-xs text-slate-400">Incremental %</span>
              <span className={`font-semibold tabular-nums ${incrementalPctColor(group.incrementalPct)}`}>
                {formatPercent(group.incrementalPct)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 border-t border-slate-100 pt-3 text-[13px] italic text-slate-500">
        Audience Overlap: {formatCompactNumber(report.overlapBetweenGroups)} people saw both partnership AND normal ads
        ({formatPercent(report.overlapBetweenGroupsPct)} of total account reach)
      </p>
    </div>
  );
}

function incrementalPctColor(pct: number): string {
  if (pct > 60) return "text-green-700";
  if (pct < 30) return "text-red-600";
  return "text-slate-900";
}

function partnershipInsights(p: GroupMetrics, n: GroupMetrics, overlapBetweenGroups: number, overlapBetweenGroupsPct: number): string[] {
  const insights: string[] = [];
  if (p.cpmr > 0 && n.cpmr > 0) {
    const ratio = n.cpmr / p.cpmr;
    if (ratio > 1.5) {
      insights.push(
        `Partnership ads reach audiences at ${formatCurrency(p.cpmr)} CPMR vs ${formatCurrency(n.cpmr)} for normal ads — ${ratio.toFixed(1)}× more cost-efficient.`
      );
    }
  }
  if (p.purchases > 0 && n.purchases > 0 && p.newPurchasePct > n.newPurchasePct + 10) {
    insights.push(
      `${formatPercent(p.newPurchasePct)} of partnership purchases are from new customers vs ${formatPercent(n.newPurchasePct)} for normal ads.`
    );
  }
  if (p.reach > 0 && n.reach > 0 && p.newReachPct < n.newReachPct) {
    insights.push(
      `⚠️ Partnership ads aren't outperforming normal ads on new audience reach (${formatPercent(p.newReachPct)} vs ${formatPercent(n.newReachPct)}). Review creator selection.`
    );
  }
  if (p.reach > 0 && p.incrementalPct > 60) {
    insights.push(
      `${formatPercent(p.incrementalPct)} of partnership reach is truly incremental — people no other campaign touches.`
    );
  }
  if (p.reach > 0 && n.reach > 0 && p.incrementalPct < n.incrementalPct - 10) {
    insights.push(
      `⚠️ Partnership ads have lower incremental reach (${formatPercent(p.incrementalPct)}) than normal ads (${formatPercent(n.incrementalPct)}). Most partnership audience is already being reached by other campaigns.`
    );
  }
  if (overlapBetweenGroupsPct > 20) {
    insights.push(
      `${formatCompactNumber(overlapBetweenGroups)} people (${formatPercent(overlapBetweenGroupsPct)} of total) are seeing both partnership AND normal ads. Consider reducing frequency on one group.`
    );
  }
  return insights;
}

const trendTickStyle = { fontSize: 12, fill: CHART_INK.muted };

export default function PartnershipAdsPage() {
  const { selectedAccountId } = useAccount();
  const { range, setRange } = useDateRange();
  const [adsExpanded, setAdsExpanded] = useState(false);
  // [PM ENHANCEMENT] — bump to re-run the fetch from the error banner's "Try again"
  const [retryKey, setRetryKey] = useState(0);
  // [PM ENHANCEMENT] — chart animations respect the OS reduced-motion setting
  const animate = !useReducedMotion();
  const { loading, isInitialLoad, data, error, run } = useJsonReport<{ data: PartnershipReport }>();

  useEffect(() => {
    if (!selectedAccountId || !range) return;
    const params = new URLSearchParams({ accountId: selectedAccountId, since: range.since, until: range.until });
    run(`/api/reports/partnership-ads?${params}`);
  }, [selectedAccountId, range, run, retryKey]);

  const report = data?.data;
  const p = report?.partnership;
  const n = report?.normal;

  const insights = useMemo(
    () => (p && n && report ? partnershipInsights(p, n, report.overlapBetweenGroups, report.overlapBetweenGroupsPct) : []),
    [p, n, report]
  );

  const noPartnershipAds = !!report && report.partnership.adCount === 0;
  const noPurchases = !!report && report.partnership.purchases === 0 && report.normal.purchases === 0;
  const allUnknownCreators = !!report && report.creators.length > 0 && report.creators.every((c) => c.handle === "Unknown");
  const fewPartnershipAds = !!report && report.partnership.adCount > 0 && report.partnership.adCount < 3;

  const compositionData = useMemo(() => {
    if (!p || !n) return { reach: [], purchases: [] };
    const toRow = (label: string, g: GroupMetrics, field: "reach" | "purchases") => {
      const total = g.segments.prospecting[field] + g.segments.engaged[field] + g.segments.existing[field];
      return {
        name: label,
        New: total > 0 ? (g.segments.prospecting[field] / total) * 100 : 0,
        Engaged: total > 0 ? (g.segments.engaged[field] / total) * 100 : 0,
        Existing: total > 0 ? (g.segments.existing[field] / total) * 100 : 0,
      };
    };
    return {
      reach: [toRow("Partnership", p, "reach"), toRow("Normal", n, "reach")],
      purchases: [toRow("Partnership", p, "purchases"), toRow("Normal", n, "purchases")],
    };
  }, [p, n]);

  const trendData = useMemo(
    () =>
      (report?.weeklyTrend ?? []).map((w) => ({
        week: formatShortDate(w.weekStart),
        partnershipNewPct: w.partnershipNewPct,
        normalNewPct: w.normalNewPct,
      })),
    [report]
  );

  const avgNewCpa = useMemo(() => {
    const rows = (report?.creators ?? []).filter((c) => c.newCpa > 0);
    return rows.length ? rows.reduce((s, c) => s + c.newCpa, 0) / rows.length : 0;
  }, [report]);

  const creatorColumns: DataTableColumn<CreatorRow>[] = useMemo(
    () => [
      {
        key: "handle",
        header: "Creator",
        accessor: (r) => r.handle,
        render: (r) =>
          r.handle === "Unknown" ? <span className="italic text-slate-400">Unknown</span> : <span className="font-semibold">{r.handle}</span>,
      },
      { key: "adCount", header: "Ads", accessor: (r) => r.adCount, align: "right" },
      { key: "totalReach", header: "Reach", help: GLOSSARY.reach, accessor: (r) => r.totalReach, align: "right", render: (r) => formatCompactNumber(r.totalReach) },
      {
        key: "newReachPct",
        header: "New Reach %",
        help: GLOSSARY.newPct,
        accessor: (r) => r.newReachPct,
        align: "right",
        cellClass: (r) => newReachCellClass(r.newReachPct),
        render: (r) => formatPercent(r.newReachPct),
      },
      { key: "totalSpend", header: "Spend", help: GLOSSARY.spend, accessor: (r) => r.totalSpend, align: "right", render: (r) => formatCurrencyCompact(r.totalSpend) },
      { key: "totalPurchases", header: "Purchases", accessor: (r) => r.totalPurchases, align: "right", render: (r) => (r.totalPurchases > 0 ? formatNumber(r.totalPurchases) : "—") },
      { key: "newPurchases", header: "New Purchases", help: "Purchases from the New Audience segment.", accessor: (r) => r.newPurchases, align: "right", render: (r) => (r.totalPurchases > 0 ? formatNumber(r.newPurchases) : "—") },
      {
        key: "newPurchasePct",
        header: "New Purchase %",
        help: "New-customer purchases as a % of this creator's total purchases.",
        accessor: (r) => r.newPurchasePct,
        align: "right",
        cellClass: (r) => (r.totalPurchases > 0 ? newPurchaseCellClass(r.newPurchasePct) : ""),
        render: (r) => (r.totalPurchases > 0 ? formatPercent(r.newPurchasePct) : "—"),
      },
      {
        key: "newCpa",
        header: "New CPA",
        help: GLOSSARY.cpp,
        accessor: (r) => r.newCpa,
        align: "right",
        cellClass: (r) => {
          if (r.newCpa <= 0 || avgNewCpa <= 0) return "";
          if (r.newCpa < avgNewCpa) return "text-green-700";
          if (r.newCpa > avgNewCpa * 1.5) return "text-red-600";
          return "";
        },
        render: (r) => (r.newCpa > 0 ? formatCurrency(r.newCpa) : "—"),
      },
      { key: "cpmr", header: "CPMR", help: GLOSSARY.cpmr, accessor: (r) => r.cpmr, align: "right", render: (r) => (r.cpmr > 0 ? formatCurrency(r.cpmr) : "—") },
    ],
    [avgNewCpa]
  );

  const adColumns: DataTableColumn<PartnershipAdRow>[] = useMemo(
    () => [
      { key: "adName", header: "Ad Name", accessor: (r) => r.adName },
      {
        key: "creatorHandle",
        header: "Creator",
        accessor: (r) => r.creatorHandle,
        render: (r) =>
          r.creatorHandle === "Unknown" ? <span className="italic text-slate-400">Unknown</span> : r.creatorHandle,
      },
      { key: "reach", header: "Reach", accessor: (r) => r.reach, align: "right", render: (r) => formatCompactNumber(r.reach) },
      {
        key: "newReachPct",
        header: "New %",
        accessor: (r) => r.newReachPct,
        align: "right",
        cellClass: (r) => newReachCellClass(r.newReachPct),
        render: (r) => formatPercent(r.newReachPct),
      },
      { key: "spend", header: "Spend", accessor: (r) => r.spend, align: "right", render: (r) => formatCurrencyCompact(r.spend) },
      { key: "purchases", header: "Purchases", accessor: (r) => r.purchases, align: "right", render: (r) => (r.purchases > 0 ? formatNumber(r.purchases) : "—") },
      { key: "newPurchases", header: "New Purchases", accessor: (r) => r.newPurchases, align: "right", render: (r) => (r.purchases > 0 ? formatNumber(r.newPurchases) : "—") },
    ],
    []
  );

  const segmentSeries = [
    { key: "New", label: "New", color: SEGMENT_COLORS.prospecting },
    { key: "Engaged", label: "Engaged", color: SEGMENT_COLORS.engaged },
    { key: "Existing", label: "Existing", color: SEGMENT_COLORS.existing },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Partnership Ads</h1>
          <p className="mt-1 text-sm text-slate-500">Compare creator partnership ads vs normal ads on new audience reach and customer acquisition.</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* [PM ENHANCEMENT] — plain-language explainer so every metric is understandable */}
      <HowToRead
        items={[
          { label: "Partnership ad", text: "an ad run through Meta's branded content tools with a creator — detected automatically from the ad's creative." },
          { label: "Creator", text: "parsed from your ad naming convention (ifs_creator_ife). Ads that don't match show as \"Unknown\"." },
          { label: "New Purchase %", text: "of the purchases a creator drove, the share that came from brand-new customers — the leaderboard's ranking metric." },
          { label: "New CPA", text: "what one new customer costs via this creator. Green = cheaper than your creator average, red = 1.5× above it." },
          { label: "Incremental Reach", text: "people this group reaches that no other campaign in the account touches — the truest measure of audience expansion, since high New Audience % can still mean your normal ads already reach those same people." },
          { label: "Audience Overlap", text: "people seeing both partnership and normal ads — high overlap means you may be paying twice to reach the same person." },
          { label: "The trend chart", text: "solid blue = partnership ads' new-audience share each week; dashed gray = normal ads. A persistent gap means creators genuinely expand your audience." },
        ]}
      />

      {error && <ErrorBanner message={error} onRetry={() => setRetryKey((k) => k + 1)} />}
      {loading && <FetchingState />}

      {!range && <EmptyState title="Select a date range" description="Choose a period above to load this report." />}

      {range && (
        <div className={`animate-fade-in transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
          {/* Edge-case banners */}
          {noPartnershipAds && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-5 py-3.5 text-[13px] leading-relaxed text-blue-800">
              No partnership ads detected. Partnership ads are identified by branded content fields in ad creatives — make sure your creator ads use Meta&apos;s branded content tools.
            </div>
          )}
          {!noPartnershipAds && fewPartnershipAds && (
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-5 py-3.5 text-[13px] leading-relaxed text-amber-800">
              Only {report!.partnership.adCount} partnership ad{report!.partnership.adCount > 1 ? "s" : ""} found — results may not be statistically significant.
            </div>
          )}
          {report && noPurchases && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-5 py-3.5 text-[13px] leading-relaxed text-blue-800">
              No purchase data found for this period. Purchase tracking requires Meta Pixel or CAPI with the purchase event configured.
            </div>
          )}
          {report && allUnknownCreators && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-5 py-3.5 text-[13px] leading-relaxed text-blue-800">
              Creator names couldn&apos;t be extracted from ad names. The app looks for the pattern <code className="rounded bg-blue-100 px-1">ifs_{"{creator}"}_ife</code> in the ad name.
            </div>
          )}

          {/* Section 1 — Head-to-head cards */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GroupCard
              title="Partnership Ads"
              group={p}
              loading={isInitialLoad}
              accent={{ headerGradient: "bg-blue-50 border-b border-blue-100", headerText: "text-blue-700", tileBg: "bg-blue-50/50" }}
            />
            <GroupCard
              title="Normal Ads"
              group={n}
              loading={isInitialLoad}
              accent={{ headerGradient: "bg-slate-50 border-b border-slate-200", headerText: "text-slate-500", tileBg: "bg-slate-50" }}
            />
          </div>

          {/* Section 2 — Delta insight banner */}
          {insights.length > 0 && (
            <div className="mt-4 rounded-xl border border-blue-100 border-l-4 border-l-brand-600 bg-blue-50 px-5 py-4">
              <div className="flex gap-3">
                <span className="text-base">💡</span>
                <div className="space-y-1 text-[13px] leading-relaxed text-blue-900">
                  {insights.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Incremental Reach Comparison — deep-dive card between the head-to-head cards and composition chart */}
          {!noPartnershipAds && <IncrementalReachCard report={report} loading={isInitialLoad} />}

          {/* Section 3 — Audience composition */}
          {!noPartnershipAds && (
            <div className="mt-6 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">Audience Composition</h2>
              <p className="mt-0.5 text-xs text-slate-400">How reach and purchases split across audience segments.</p>
              {isInitialLoad ? (
                <ChartSkeleton height={280} />
              ) : (
                <div className="mt-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reach composition</div>
                  <HorizontalBar
                    data={compositionData.reach}
                    categoryKey="name"
                    stacked
                    height={130}
                    valueFormat="percent"
                    series={segmentSeries}
                  />
                  <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Purchase composition</div>
                  {noPurchases ? (
                    <p className="mt-2 text-xs text-slate-400">No purchase data in this period.</p>
                  ) : (
                    <HorizontalBar
                      data={compositionData.purchases}
                      categoryKey="name"
                      stacked
                      height={130}
                      valueFormat="percent"
                      series={segmentSeries}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section 4 — Weekly trend */}
          {!noPartnershipAds && (
            <div className="mt-6 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">New Audience % — Weekly Trend</h2>
              <p className="mb-4 mt-0.5 text-xs text-slate-400">Partnership vs normal ads: what share of weekly reach is new people.</p>
              {isInitialLoad ? (
                <ChartSkeleton height={320} />
              ) : (
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <ComposedChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />
                      <XAxis dataKey="week" tick={trendTickStyle} axisLine={{ stroke: CHART_CHROME.axis }} tickLine={false} />
                      <YAxis tick={trendTickStyle} axisLine={false} tickLine={false} width={44} domain={[0, 100]} tickFormatter={(v: number) => `${Math.round(v)}%`} />
                      <Tooltip
                        formatter={(value, name) => [`${Number(value ?? 0).toFixed(1)}%`, String(name)]}
                        labelFormatter={(label) => `Week of ${label}`}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
                      <Area type="monotone" dataKey="partnershipNewPct" name="Partnership New %" stroke="none" fill="#2563EB" fillOpacity={0.08} isAnimationActive={false} legendType="none" tooltipType="none" />
                      <Line type="monotone" dataKey="partnershipNewPct" name="Partnership New %" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3, fill: "#2563EB", strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }} isAnimationActive={animate} animationDuration={600} animationEasing="ease-out" />
                      <Line type="monotone" dataKey="normalNewPct" name="Normal New %" stroke="#94A3B8" strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3, fill: "#fff", stroke: "#94A3B8", strokeWidth: 1.5 }} activeDot={{ r: 6 }} isAnimationActive={animate} animationDuration={600} animationEasing="ease-out" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Section 5 — Creator leaderboard */}
          {!noPartnershipAds && (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">Creator Leaderboard</h2>
              <DataTable
                columns={creatorColumns}
                rows={report?.creators ?? []}
                loading={isInitialLoad}
                filename="creator-leaderboard"
                defaultSortKey="newPurchasePct"
                defaultSortDir="desc"
              />
            </div>
          )}

          {/* Section 6 — All partnership ads, collapsed by default */}
          {!noPartnershipAds && report && (
            <div className="mt-6">
              <button
                onClick={() => setAdsExpanded((o) => !o)}
                className="flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-brand-600"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${adsExpanded ? "rotate-90" : ""}`}>
                  <path d="m9 18 6-6-6-6" />
                </svg>
                View all partnership ads ({report.partnershipAds.length} ads)
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${adsExpanded ? "mt-3 max-h-[4000px] opacity-100" : "max-h-0 opacity-0"}`}>
                <DataTable
                  columns={adColumns}
                  rows={report.partnershipAds}
                  loading={isInitialLoad}
                  filename="partnership-ads"
                  defaultSortKey="newPurchases"
                  defaultSortDir="desc"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
