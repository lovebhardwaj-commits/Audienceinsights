interface ProgressIndicatorProps {
  current: number;
  total: number;
  label: string;
  onCancel?: () => void;
}

export function ProgressIndicator({ current, total, label, onCancel }: ProgressIndicatorProps) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tabular-nums text-brand-600">{pct}%</span>
          {onCancel && (
            <button onClick={onCancel} className="text-xs font-medium text-slate-400 transition-colors hover:text-red-500">
              Cancel
            </button>
          )}
        </div>
      </div>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
