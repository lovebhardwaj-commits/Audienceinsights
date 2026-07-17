"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Fetching your data…",
  "Talking to Meta's Ads API…",
  "Crunching the numbers…",
  "Almost there…",
];

/** Prominent loading banner shown while a report's first fetch is in flight —
 *  rotates through friendly messages so long pulls never look frozen. */
export function FetchingState({ label }: { label?: string }) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setMsgIndex((i) => Math.min(i + 1, MESSAGES.length - 1)), 4000);
    return () => clearInterval(id);
  }, []);

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
        <div className="text-sm font-semibold text-slate-800">{label ?? MESSAGES[msgIndex]}</div>
        <div className="mt-0.5 text-xs text-slate-500">
          Pulling live data from your ad account — this usually takes a few seconds.
        </div>
      </div>
    </div>
  );
}
