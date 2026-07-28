"use client";

interface ReportSummaryProps {
  insights: string[];
  loading?: boolean;
}

export function ReportSummary({ insights, loading = false }: ReportSummaryProps) {
  if (loading) {
    return (
      <div className="mt-4 rounded-xl px-5 py-4"
        style={{ background: "rgba(175, 70, 253, 0.04)", border: "1px solid rgba(175, 70, 253, 0.1)" }}
      >
        <div className="h-3 w-16 animate-pulse rounded" style={{ background: "rgba(175, 70, 253, 0.15)" }} />
        <div className="mt-2 space-y-1.5">
          <div className="h-3 w-full animate-pulse rounded" style={{ background: "rgba(175, 70, 253, 0.1)" }} />
          <div className="h-3 w-3/4 animate-pulse rounded" style={{ background: "rgba(175, 70, 253, 0.1)" }} />
        </div>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="mt-4 animate-fade-in rounded-xl px-5 py-4"
      style={{ background: "rgba(175, 70, 253, 0.04)", border: "1px solid rgba(175, 70, 253, 0.1)" }}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-500">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
        Key Insights
      </div>
      <ul className="mt-2 space-y-1">
        {insights.map((insight, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-ink-secondary">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}
