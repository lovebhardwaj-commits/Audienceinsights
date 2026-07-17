"use client";

// FindingsStrip (Part 6) — renders ranked, severity-tinted verdict cards above a report's
// chart, replacing ad-hoc "Key Insights". Each card leads with money/magnitude, names the
// entity, and ends in exactly one action.

import { rankFindings, type Finding, type FindingSeverity } from "@/lib/findings";

const TONE: Record<FindingSeverity, { border: string; bg: string; dot: string; chip: string; label: string }> = {
  critical: { border: "border-l-sev-critical", bg: "bg-sev-critical-bg", dot: "bg-sev-critical", chip: "text-sev-critical", label: "Critical" },
  warning: { border: "border-l-sev-warning", bg: "bg-sev-warning-bg", dot: "bg-sev-warning", chip: "text-[#a9781a]", label: "Watch" },
  good: { border: "border-l-sev-good", bg: "bg-sev-good-bg", dot: "bg-sev-good", chip: "text-sev-good", label: "Healthy" },
  info: { border: "border-l-brand-500", bg: "bg-brand-50", dot: "bg-brand-500", chip: "text-brand-700", label: "Note" },
};

export function FindingsStrip({ findings, loading = false }: { findings: Finding[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-[10px] border border-hairline bg-surface-card" />
        ))}
      </div>
    );
  }
  if (findings.length === 0) return null;
  const ranked = rankFindings(findings);

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {ranked.map((f, i) => {
        const t = TONE[f.severity];
        return (
          <div key={i} className={`rounded-[10px] border border-hairline border-l-4 ${t.border} ${t.bg} p-4`}>
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${t.chip}`}>{t.label}</span>
            </div>
            <div className="mt-1.5 text-sm font-semibold text-ink">{f.headline}</div>
            <div className="mt-1 text-xs leading-relaxed text-ink-secondary">{f.detail}</div>
            <div className="mt-2 text-xs text-ink-secondary leading-relaxed">
              <span className="font-medium text-ink-tertiary mr-1">→</span>
              {f.action}
            </div>
          </div>
        );
      })}
    </div>
  );
}
