"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useAccount } from "@/components/providers/AccountProvider";
import { REPORTS } from "@/lib/constants";
import { REPORT_ICONS } from "@/components/layout/icons";
import { Skeleton } from "@/components/ui/Skeleton";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { useJsonReport } from "@/lib/hooks/useJsonReport";
import { lastNMonths } from "@/lib/dates";
import { formatCompactNumber, formatCurrencyCompact, formatNumber } from "@/lib/format";
import { freqSeverity } from "@/lib/severity";
import { conversionFindings, frequencyFindings, rankFindings, type Finding } from "@/lib/findings";
import type { PulseReport } from "@/lib/reports/pulse";
import type { ConversionWindowsReport } from "@/lib/reports/conversion-windows";
import type { FrequencyReport } from "@/lib/reports/frequency";

const FEED_TONE: Record<Finding["severity"], { border: string; bg: string; chip: string; label: string }> = {
  critical: { border: "border-l-sev-critical", bg: "bg-sev-critical-bg", chip: "text-sev-critical", label: "Critical" },
  warning: { border: "border-l-sev-warning", bg: "bg-sev-warning-bg", chip: "text-[#a9781a]", label: "Watch" },
  good: { border: "border-l-sev-good", bg: "bg-sev-good-bg", chip: "text-sev-good", label: "Healthy" },
  info: { border: "border-l-brand-500", bg: "bg-brand-50", chip: "text-brand-700", label: "Note" },
};

function mom(series: number[]): number | undefined {
  if (series.length < 2) return undefined;
  const prev = series[series.length - 2];
  const last = series[series.length - 1];
  if (!prev) return undefined;
  return ((last - prev) / prev) * 100;
}

export default function DashboardPage() {
  const { accounts, selectedAccountId, loading, error } = useAccount();
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const pulse = useJsonReport<{ data: PulseReport }>();
  // Background feeds for the findings feed — cheap-ish account-level reports.
  const conv = useJsonReport<{ data: ConversionWindowsReport }>();
  const freq = useJsonReport<{ data: FrequencyReport }>();

  useEffect(() => {
    if (!selectedAccountId) return;
    const r = lastNMonths(4);
    const q = new URLSearchParams({ accountId: selectedAccountId, since: r.since, until: r.until });
    pulse.run(`/api/reports/pulse?${q}`);
    conv.run(`/api/reports/conversion-windows?${q}`);
    freq.run(`/api/reports/frequency?${q}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  const months = pulse.data?.data.months ?? [];
  const latest = months[months.length - 1];

  const findings = useMemo(() => {
    const all: Finding[] = [];
    if (conv.data?.data) all.push(...conversionFindings(conv.data.data));
    if (freq.data?.data) all.push(...frequencyFindings(freq.data.data));
    return rankFindings(all);
  }, [conv.data, freq.data]);

  const feedLoading = conv.isInitialLoad || freq.isInitialLoad;

  return (
    <div className="mx-auto max-w-6xl">
      {loading && (
        <div className="rounded-[10px] border border-hairline bg-surface-card p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-6 w-48" />
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-5 py-4">
          <div className="text-sm font-medium text-red-700">{error}</div>
        </div>
      )}

      {!loading && !error && accounts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-hairline bg-surface-card py-20">
          <div className="text-sm font-medium text-ink-secondary">No ad accounts found</div>
          <div className="mt-1 text-xs text-ink-tertiary">Make sure you approved ads_read access for at least one account.</div>
        </div>
      )}

      {selectedAccount && (
        <div className="animate-fade-in rounded-[10px] border border-hairline bg-surface-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary">Active Account</div>
              <div className="mt-1 text-xl font-bold text-ink">{selectedAccount.name}</div>
            </div>
            <div className="flex items-center gap-4 text-xs text-ink-tertiary">
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-sev-good" />Connected</div>
              <div>{selectedAccount.currency}</div>
              <div className="font-mono text-[11px]">{selectedAccount.id}</div>
            </div>
          </div>
        </div>
      )}

      {/* Pulse band — account trend at a glance (Part 6). */}
      {selectedAccount && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Monthly Reach"
            value={latest ? formatCompactNumber(latest.reach) : "—"}
            sublabel="last full month"
            loading={pulse.isInitialLoad}
            trend={mom(months.map((m) => m.reach))}
            trendLabel="MoM"
            sparkline={months.map((m) => m.reach)}
            sparklineColor="var(--color-metric-new)"
          />
          <SummaryCard
            label="Monthly Spend"
            value={latest ? formatCurrencyCompact(latest.spend) : "—"}
            sublabel="last full month"
            loading={pulse.isInitialLoad}
            sparkline={months.map((m) => m.spend)}
          />
          <SummaryCard
            label="Avg Frequency"
            value={latest ? `${latest.frequency.toFixed(2)}×` : "—"}
            sublabel="last full month"
            loading={pulse.isInitialLoad}
            severity={latest ? freqSeverity(latest.frequency) : undefined}
            sparkline={months.map((m) => m.frequency)}
            sparklineColor="var(--color-metric-repeat)"
          />
          <SummaryCard
            label="Purchases"
            value={latest ? formatNumber(latest.purchases) : "—"}
            sublabel="last full month"
            loading={pulse.isInitialLoad}
            trend={mom(months.map((m) => m.purchases))}
            trendLabel="MoM"
            sparkline={months.map((m) => m.purchases)}
            sparklineColor="var(--color-metric-new)"
          />
        </div>
      )}

      {/* Findings feed — ranked verdicts across reports (Part 6). */}
      {selectedAccount && (
        <div className="mt-8">
          <h2 className="text-sm font-bold text-ink">What needs your attention</h2>
          {feedLoading && findings.length === 0 ? (
            <div className="mt-4 space-y-3">
              {[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-[10px] border border-hairline bg-surface-card" />)}
            </div>
          ) : findings.length === 0 ? (
            <div className="mt-4 rounded-[10px] border border-hairline bg-surface-card px-5 py-6 text-sm text-ink-tertiary">
              No findings yet — open a report to run a deeper analysis.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {findings.map((f, i) => {
                const t = FEED_TONE[f.severity];
                return (
                  <Link
                    key={i}
                    href={`/reports/${f.report}`}
                    className={`block rounded-[10px] border border-hairline border-l-4 ${t.border} ${t.bg} p-4 transition-transform hover:-translate-y-0.5`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${t.chip}`}>{t.label}</span>
                      <span className="text-[11px] text-ink-tertiary">{REPORTS.find((r) => r.slug === f.report)?.title ?? f.report} →</span>
                    </div>
                    <div className="mt-1.5 text-sm font-semibold text-ink">{f.headline}</div>
                    <div className="mt-1 text-xs leading-relaxed text-ink-secondary">{f.detail}</div>
                    <div className="mt-2 text-xs font-medium text-ink">→ {f.action}</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Demoted report directory. */}
      <div className="mt-8">
        <h2 className="text-sm font-bold text-ink">All reports</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map((report, i) => {
            const Icon = REPORT_ICONS[report.slug];
            return (
              <Link
                key={report.slug}
                href={`/reports/${report.slug}`}
                className={`animate-slide-up stagger-${Math.min(i % 4, 4)} group rounded-[10px] border border-hairline bg-surface-card p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-app text-ink-tertiary transition-colors group-hover:text-brand-600">
                    {Icon && <Icon />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink">{report.title}</div>
                    <div className="truncate text-xs text-ink-tertiary">{report.description}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
