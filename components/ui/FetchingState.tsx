"use client";

import { useEffect, useState } from "react";

// [PM ENHANCEMENT] — loading copy never promises a duration it can't keep (D9).
// It states WHAT is happening and WHY it's slow, and escalates honestly past 30s.

const LIGHT_MESSAGES = [
  "Fetching your data…",
  "Talking to Meta's Ads API…",
  "Crunching the numbers…",
];

const HEAVY_MESSAGES = [
  "Querying Meta one entity at a time…",
  "This is a heavy report — hang tight…",
  "Still gathering results from Meta…",
];

export type ReportWeight = "light" | "heavy";

interface FetchingStateProps {
  label?: string;
  /** Heavy reports (overlap, partnership, churn) run one query per entity — copy says so. */
  reportWeight?: ReportWeight;
  /** Optional override for the secondary line; otherwise generated from weight + elapsed. */
  detail?: string;
}

export function FetchingState({ label, reportWeight = "light", detail }: FetchingStateProps) {
  const messages = reportWeight === "heavy" ? HEAVY_MESSAGES : LIGHT_MESSAGES;
  const [msgIndex, setMsgIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const rotator = setInterval(() => setMsgIndex((i) => Math.min(i + 1, messages.length - 1)), 4000);
    const ticker = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      clearInterval(rotator);
      clearInterval(ticker);
    };
  }, [messages.length]);

  const secondary =
    detail ??
    (elapsed > 30
      ? "Still working — Meta rate-limits heavy reports, so this can take a little longer."
      : reportWeight === "heavy"
        ? "Heavy report: one query per entity to stay within Meta's limits."
        : "Pulling live data from your ad account.");

  return (
    <div className="mt-4 flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-4">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-blue-100 border-t-brand-600" />
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v16a2 2 0 0 0 2 2h16" />
          <path d="M7 14l4-4 4 3 5-6" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-800">{label ?? messages[msgIndex]}</div>
        <div className="mt-0.5 text-xs text-slate-500">
          {secondary}
          {elapsed > 5 && <span className="ml-1.5 tabular-nums text-slate-400">· {elapsed}s</span>}
        </div>
      </div>
    </div>
  );
}
