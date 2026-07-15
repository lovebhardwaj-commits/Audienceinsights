interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200/60 bg-gradient-to-b from-white to-slate-50/80">
      <div className="px-6 py-8">
        <div className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-700">{title}</h3>
          {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
        </div>
      </div>

      {/* Ghost preview — hints at report structure */}
      <div className="border-t border-slate-100 px-6 py-5 opacity-40">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg bg-slate-50 p-4">
              <div className="h-2 w-12 rounded bg-slate-200" />
              <div className="mt-2 h-5 w-16 rounded bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg bg-slate-50 p-4">
          <div className="h-2 w-24 rounded bg-slate-200" />
          <div className="mt-3 flex items-end gap-2">
            {[30, 50, 35, 65, 45, 70, 40, 60, 55, 75].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-slate-100" style={{ height: `${h}px` }} />
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-slate-50 p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-3 w-20 rounded bg-slate-100" />
                <div className="h-3 w-14 rounded bg-slate-100" />
                <div className="h-3 w-14 rounded bg-slate-100" />
                <div className="h-3 w-14 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
