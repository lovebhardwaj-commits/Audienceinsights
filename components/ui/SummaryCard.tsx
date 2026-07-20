"use client";

import { Skeleton } from "./Skeleton";
import { InfoTooltip } from "./InfoTooltip";
import { Sparkline } from "@/components/charts/Sparkline";
import type { Severity } from "@/lib/severity";

export type { Severity };

const SEVERITY_BORDER: Record<Severity, string> = {
  good: "border-l-4 border-l-sev-good",
  warning: "border-l-4 border-l-sev-warning",
  serious: "border-l-4 border-l-sev-serious",
  critical: "border-l-4 border-l-sev-critical",
};
const SEVERITY_VALUE: Record<Severity, string> = {
  good: "text-sev-good",
  warning: "text-[#a9781a]", // darkened warning for text contrast on paper
  serious: "text-sev-serious",
  critical: "text-sev-critical",
};
const SEVERITY_CHIP: Record<Severity, string> = {
  good: "bg-sev-good-bg text-sev-good",
  warning: "bg-sev-warning-bg text-[#a9781a]",
  serious: "bg-sev-serious-bg text-sev-serious",
  critical: "bg-sev-critical-bg text-sev-critical",
};
const SEVERITY_LABEL: Record<Severity, string> = {
  good: "Healthy",
  warning: "Watch",
  serious: "Serious",
  critical: "Critical",
};

interface SummaryCardProps {
  label: string;
  value: string;
  /** Context line under the value, e.g. "deduplicated". */
  sublabel?: string;
  title?: string;
  help?: string;
  loading?: boolean;
  /** % change vs previous equal-length period (positive = good). Renders a ▲/▼ delta chip. */
  trend?: number;
  trendLabel?: string;
  /** When true, a negative trend is shown green (lower = better, e.g. CPMR, CPP). */
  invertTrend?: boolean;
  /** Severity applies a left border + value color + a text chip. Chrome stays neutral otherwise (D12). */
  severity?: Severity;
  /** 30-ish point series for the sparkline; omitted → no sparkline. */
  sparkline?: number[];
  /** Sparkline color — pass a metric-identity hex, else neutral ink. */
  sparklineColor?: string;

  // --- deprecated (Part 2.2 killed decorative icon chips + rainbow borders) ---
  /** @deprecated icon chips removed as filler; prop ignored. */
  icon?: React.ReactNode;
  /** @deprecated ignored. */
  iconColor?: string;
  /** @deprecated rainbow borders removed; use `severity`. Prop ignored. */
  accentColor?: string;
}

export function SummaryCard({
  label,
  value,
  sublabel,
  title,
  help,
  loading = false,
  trend,
  trendLabel,
  invertTrend = false,
  severity,
  sparkline,
  sparklineColor,
}: SummaryCardProps) {
  const trendPositive = trend !== undefined && (invertTrend ? trend <= 0 : trend >= 0);
  const trendNeutral = trend !== undefined && Math.abs(trend) < 1;

  return (
    <div
      className={`flex flex-col rounded-[10px] border border-hairline bg-surface-card p-5 ${
        severity ? SEVERITY_BORDER[severity] : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {/* D14 — reserve two lines so a wrapping label never overlaps during refetch-dim. */}
        <div className="flex min-h-[2.4em] items-start gap-0.5 text-[11px] font-semibold uppercase leading-tight tracking-wider text-ink-tertiary">
          <span className="min-w-0">{label}</span>
          {help && <InfoTooltip text={help} />}
        </div>
        {severity && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_CHIP[severity]}`}>
            {SEVERITY_LABEL[severity]}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <span
            className={`font-mono text-[28px] font-medium leading-tight tabular-nums ${severity ? SEVERITY_VALUE[severity] : "text-ink"}`}
            title={title}
          >
            {value}
          </span>
        )}
        {trend !== undefined && !loading && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
              trendNeutral
                ? "bg-surface-app text-ink-tertiary"
                : trendPositive
                ? "bg-sev-good-bg text-sev-good"
                : "bg-sev-critical-bg text-sev-critical"
            }`}
          >
            {trendNeutral ? "→" : trendPositive ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
            {trendLabel && <span className="ml-0.5 font-normal text-[10px]">{trendLabel}</span>}
          </span>
        )}
      </div>

      {sublabel && !loading && <div className="mt-0.5 text-[11px] text-ink-tertiary">{sublabel}</div>}

      {sparkline && sparkline.length >= 2 && !loading && (
        <div className="mt-3">
          <Sparkline data={sparkline} color={sparklineColor} width={140} height={30} />
        </div>
      )}
    </div>
  );
}
