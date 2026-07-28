"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Fetching your data…",
  "Talking to Meta's Ads API…",
  "Crunching the numbers…",
  "Almost there…",
];

export function FetchingState({ label }: { label?: string }) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setMsgIndex((i) => Math.min(i + 1, MESSAGES.length - 1)), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-4 flex items-center gap-4 rounded-xl px-5 py-4"
      style={{ background: "rgba(175, 70, 253, 0.06)", border: "1px solid rgba(175, 70, 253, 0.15)" }}
    >
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full" style={{ border: "2px solid rgba(175, 70, 253, 0.15)", borderTopColor: "#AF46FD" }} />
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#AF46FD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v16a2 2 0 0 0 2 2h16" />
          <path d="M7 14l4-4 4 3 5-6" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-semibold text-ink">{label ?? MESSAGES[msgIndex]}</div>
        <div className="mt-0.5 text-xs text-ink-tertiary">
          Pulling live data from your ad account — this usually takes a few seconds.
        </div>
      </div>
    </div>
  );
}
