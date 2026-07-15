import { Skeleton } from "./Skeleton";
import { InfoTooltip } from "./InfoTooltip";

interface SummaryCardProps {
  label: string;
  value: string;
  sublabel?: string;
  title?: string;
  help?: string;
  loading?: boolean;
  icon?: React.ReactNode;
  iconColor?: string;
  /** Percentage change vs prev period (positive = good, negative = bad). Shows ▲/▼ badge. */
  trend?: number;
  trendLabel?: string;
  /** Left accent border color class, e.g. "border-l-blue-500" */
  accentColor?: string;
}

export function SummaryCard({
  label,
  value,
  sublabel,
  title,
  help,
  loading = false,
  icon,
  iconColor = "bg-brand-50 text-brand-600",
  trend,
  trendLabel,
  accentColor,
}: SummaryCardProps) {
  const trendPositive = trend !== undefined && trend >= 0;
  const trendNeutral = trend !== undefined && Math.abs(trend) < 1;

  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-[0_1px_4px_0_rgb(0,0,0,0.07)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_0_rgb(0,0,0,0.1)] ${
        accentColor ? `border-l-4 ${accentColor}` : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
            {help && <InfoTooltip text={help} />}
          </div>
          {loading ? (
            <Skeleton className="mt-2.5 h-8 w-28" />
          ) : (
            <div className="mt-1.5">
              <span className="text-[28px] font-bold leading-tight tabular-nums text-slate-900" title={title}>
                {value}
              </span>
            </div>
          )}
          {sublabel && !loading && <div className="mt-0.5 text-[11px] text-slate-400">{sublabel}</div>}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {trend !== undefined && !loading && (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                trendNeutral
                  ? "bg-slate-100 text-slate-500"
                  : trendPositive
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {trendNeutral ? "→" : trendPositive ? "▲" : "▼"}
              {" "}
              {Math.abs(trend).toFixed(1)}%
              {trendLabel && <span className="ml-0.5 font-normal text-[10px]">{trendLabel}</span>}
            </span>
          )}
          {icon && (
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-sm ${iconColor}`}>
              {icon}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
