"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "@/components/providers/AccountProvider";
import { useDateRange } from "@/components/providers/DateRangeProvider";
import { useJsonReport } from "@/lib/hooks/useJsonReport";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FetchingState } from "@/components/ui/FetchingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { HowToRead } from "@/components/ui/HowToRead";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { formatShortDate } from "@/lib/format";
import type { FrequencyReport } from "@/lib/reports/frequency";

const FREQ_COLORS = [
  "#dbeafe", // 1–1.5 — very light blue
  "#93c5fd", // 1.5–2
  "#60a5fa", // 2–3
  "#f59e0b", // 3–4 — amber caution
  "#ef4444", // 4–5 — red warning
  "#7f1d1d", // 5+ — dark red
];

function freqColor(freq: number): string {
  if (freq <= 0) return "#f1f5f9";
  if (freq <= 1.5) return FREQ_COLORS[0];
  if (freq <= 2) return FREQ_COLORS[1];
  if (freq <= 3) return FREQ_COLORS[2];
  if (freq <= 4) return FREQ_COLORS[3];
  if (freq <= 5) return FREQ_COLORS[4];
  return FREQ_COLORS[5];
}

function freqTextColor(freq: number): string {
  return freq > 3 ? "#fff" : "#1e293b";
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export default function FrequencyPage() {
  const { selectedAccountId } = useAccount();
  const { range, setRange } = useDateRange();
  const [retryKey, setRetryKey] = useState(0);
  const { loading, isInitialLoad, data, error, run } = useJsonReport<{ data: FrequencyReport }>();

  useEffect(() => {
    if (!selectedAccountId || !range) return;
    const params = new URLSearchParams({ accountId: selectedAccountId, since: range.since, until: range.until });
    run(`/api/reports/frequency?${params}`);
  }, [selectedAccountId, range, run, retryKey]);

  const report = data?.data;

  const { avgFreq, maxFreq, hotCampaigns } = useMemo(() => {
    if (!report) return { avgFreq: 0, maxFreq: 0, hotCampaigns: 0 };
    let total = 0;
    let count = 0;
    let max = 0;
    let hot = 0;
    for (const c of report.campaigns) {
      for (const w of report.weeks) {
        const cell = report.matrix[c.id]?.[w];
        if (cell && cell.frequency > 0) {
          total += cell.frequency;
          count++;
          if (cell.frequency > max) max = cell.frequency;
          if (cell.frequency > 5) hot++;
        }
      }
    }
    return { avgFreq: count > 0 ? total / count : 0, maxFreq: max, hotCampaigns: hot };
  }, [report]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Frequency Heatmap</h1>
          <p className="mt-1 text-sm text-slate-500">How often each campaign exposes the same people, week by week.</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <HowToRead
        items={[
          { label: "Frequency", text: "average times a person saw a campaign's ads in that week. Above 3 means you're paying to repeat yourself." },
          { label: "Color scale", text: "blue = healthy (≤2×), amber = caution (3–4×), red = overexposed (5×+)." },
          { label: "Empty cell", text: "campaign wasn't running that week." },
          { label: "Reading the grid", text: "scan across a row to spot campaigns that stay red week after week — those are your fatigue risks." },
        ]}
      />

      {error && <ErrorBanner message={error} onRetry={() => setRetryKey((k) => k + 1)} />}
      {loading && <FetchingState />}
      {!range && <EmptyState title="Select a date range" description="Choose a period above to load this report." />}

      {range && (
        <div className="animate-fade-in">
          <div className={`mt-4 grid grid-cols-3 gap-3 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <SummaryCard
              label="Avg Frequency"
              value={report ? avgFreq.toFixed(2) + "×" : "—"}
              sublabel="across all campaigns × weeks"
              loading={isInitialLoad}
              iconColor="bg-blue-50 text-blue-600"
              accentColor="border-l-blue-500"
            />
            <SummaryCard
              label="Peak Frequency"
              value={report ? maxFreq.toFixed(1) + "×" : "—"}
              sublabel="highest single week"
              loading={isInitialLoad}
              iconColor={maxFreq > 5 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}
              accentColor={maxFreq > 5 ? "border-l-red-500" : "border-l-amber-400"}
            />
            <SummaryCard
              label="Overexposure Alerts"
              value={report ? String(hotCampaigns) : "—"}
              sublabel="campaign–week combos at 5×+"
              loading={isInitialLoad}
              iconColor={hotCampaigns > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}
              accentColor={hotCampaigns > 0 ? "border-l-red-500" : "border-l-emerald-500"}
            />
          </div>

          <div className={`mt-6 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Frequency by campaign × week</h2>
                <p className="mt-0.5 text-xs text-slate-400">Top 25 campaigns by total reach. Cell = avg frequency for that week.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-[11px] text-slate-400">
                <span>Low</span>
                {FREQ_COLORS.map((c, i) => (
                  <div key={i} className="h-3 w-5 rounded-sm" style={{ background: c }} />
                ))}
                <span>High</span>
              </div>
            </div>

            {isInitialLoad ? (
              <ChartSkeleton height={400} />
            ) : !report || report.campaigns.length === 0 ? (
              <EmptyState title="No campaign data" description="No campaigns ran in this period." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-white py-2 pr-3 text-left text-[11px] font-medium text-slate-500 whitespace-nowrap min-w-[180px]">
                        Campaign
                      </th>
                      {report.weeks.map((w) => (
                        <th key={w} className="px-1 py-2 text-center text-[10px] font-medium text-slate-400 whitespace-nowrap">
                          {formatShortDate(w)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.campaigns.map((campaign) => (
                      <tr key={campaign.id} className="group">
                        <td
                          className="sticky left-0 z-10 bg-white py-1.5 pr-3 font-medium text-slate-700 group-hover:bg-slate-50"
                          title={campaign.name}
                        >
                          {truncate(campaign.name, 32)}
                        </td>
                        {report.weeks.map((w) => {
                          const cell = report.matrix[campaign.id]?.[w];
                          const freq = cell?.frequency ?? 0;
                          return (
                            <td key={w} className="px-0.5 py-1.5">
                              <div
                                className="mx-auto flex h-8 min-w-[40px] items-center justify-center rounded text-center font-semibold tabular-nums"
                                style={{
                                  background: freqColor(freq),
                                  color: freqTextColor(freq),
                                }}
                                title={freq > 0 ? `${campaign.name} — week of ${formatShortDate(w)}: ${freq.toFixed(2)}× frequency` : "No data"}
                              >
                                {freq > 0 ? freq.toFixed(1) : ""}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
