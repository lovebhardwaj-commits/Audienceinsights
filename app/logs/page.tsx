import { isActivityLogConfigured } from "@/lib/activity-log";

export default function LogsPage() {
  const configured = isActivityLogConfigured();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-app px-6 py-8">
      <div className="w-full max-w-md rounded-xl border border-hairline bg-surface-card p-8 text-center">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-700 text-sm font-bold text-white">
          A
        </div>
        <h1 className="mt-3 text-lg font-bold text-ink">Ads Reach — Activity Log</h1>
        <p className="mt-1 text-xs text-ink-tertiary">
          Internal only — not visible to merchants. Every report fetch, success or failure, appended live to a Google Sheet.
        </p>

        {configured ? (
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            Logging is active — check the Sheet directly for entries.
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs text-amber-800">
            Logging isn&apos;t wired up yet — set ACTIVITY_LOG_WEBHOOK_URL to the Apps Script Web App URL.
          </div>
        )}
      </div>
    </div>
  );
}
