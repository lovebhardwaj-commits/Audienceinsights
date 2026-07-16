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

function CopyableTruncatedName({ name, max }: { name: string; max: number }) {
  function handleCopy(e: React.ClipboardEvent) {
    e.preventDefault();
    e.clipboardData.setData("text/plain", name);
  }
  return (
    <span
      className="block max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap"
      title={name}
      onCopy={handleCopy}
    >
      {name.length > max ? name.slice(0, max - 1) + "…" : name}
    </span>
  );
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

  const { avgFreq, maxFreq, hotCampaigns, overexposedCampaigns } = useMemo(() => {
    if (!report) return { avgFreq: 0, maxFreq: 0, hotCampaigns: 0, overexposedCampaigns: [] as { name: string; peakFreq: number; hotWeeks: number }[] };
    let total = 0;
    let count = 0;
    let max = 0;
    let hot = 0;
    const campaignHeat: Record<string, { name: string; peakFreq: number; hotWeeks: number }> = {};
    for (const c of report.campaigns) {
      let peakFreq = 0;
      let hotWeeks = 0;
      for (const w of report.weeks) {
        const cell = report.matrix[c.id]?.[w];
        if (cell && cell.frequency > 0) {
          total += cell.frequency;
          count++;
          if (cell.frequency > max) max = cell.frequency;
          if (cell.frequency > 5) { hot++; hotWeeks++; }
          if (cell.frequency > peakFreq) peakFreq = cell.frequency;
        }
      }
      if (hotWeeks > 0) {
        campaignHeat[c.id] = { name: c.name, peakFreq, hotWeeks };
      }
    }
    const overexposed = Object.values(campaignHeat).sort((a, b) => b.hotWeeks - a.hotWeeks);
    return { avgFreq: count > 0 ? total / count : 0, maxFreq: max, hotCampaigns: hot, overexposedCampaigns: overexposed };
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

          {!isInitialLoad && report && overexposedCampaigns.length > 0 && (
            <div className={`mt-4 rounded-xl border border-red-100 bg-red-50/50 p-4 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    {overexposedCampaigns.length === 1
                      ? "1 campaign is overexposing your audience"
                      : `${overexposedCampaigns.length} campaigns are overexposing your audience`}
                  </p>
                  <p className="mt-1 text-xs text-red-700/80">
                    These campaigns hit 5×+ frequency in at least one week — people are seeing the same ads too many times, which drives up cost and causes ad fatigue.
                  </p>
                  <div className="mt-3 space-y-1.5">
                    {overexposedCampaigns.slice(0, 5).map((c) => (
                      <div key={c.name} className="flex items-center gap-2 text-xs">
                        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded bg-red-100 px-1.5 text-[10px] font-bold text-red-700 tabular-nums">
                          {c.peakFreq.toFixed(1)}×
                        </span>
                        <span className="font-medium text-red-900 truncate max-w-[280px]" title={c.name} onCopy={(e) => { e.preventDefault(); e.clipboardData.setData("text/plain", c.name); }}>{c.name}</span>
                        <span className="text-red-600/70">
                          — overexposed {c.hotWeeks} {c.hotWeeks === 1 ? "week" : "weeks"}
                        </span>
                      </div>
                    ))}
                    {overexposedCampaigns.length > 5 && (
                      <p className="text-[11px] text-red-600/60">+ {overexposedCampaigns.length - 5} more in the grid below</p>
                    )}
                  </div>
                  <div className="mt-3 rounded-lg bg-white/60 px-3 py-2 text-xs text-slate-700">
                    <p className="font-semibold text-slate-800">What to do</p>
                    <ul className="mt-1 list-disc pl-4 space-y-0.5 text-slate-600">
                      <li>Set a frequency cap of 3–4× per week in campaign settings</li>
                      <li>Broaden your audience targeting to reduce repeat exposure</li>
                      <li>Rotate fresh creatives into campaigns that stay red week after week</li>
                      <li>Consider pausing campaigns that have been overexposed for 3+ consecutive weeks</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isInitialLoad && report && overexposedCampaigns.length === 0 && hotCampaigns === 0 && report.campaigns.length > 0 && (
            <div className={`mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 transition-opacity duration-200 ${loading && !isInitialLoad ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">No overexposure detected</p>
                  <p className="mt-0.5 text-xs text-emerald-700/80">All campaigns stayed below 5× frequency this period. Your audience isn&apos;t seeing ads too often.</p>
                </div>
              </div>
            </div>
          )}

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
                        >
                          <CopyableTruncatedName name={campaign.name} max={32} />
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
