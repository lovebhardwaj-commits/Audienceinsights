import { isActivityLogConfigured } from "@/lib/activity-log";

export default function LogsPage() {
  const configured = isActivityLogConfigured();
  const sheetUrl = process.env.ACTIVITY_LOG_SHEET_VIEW_URL;

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

        {configured && sheetUrl ? (
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Open the log sheet →
          </a>
        ) : (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs text-amber-800">
            {!configured
              ? "Logging isn't wired up yet — set ACTIVITY_LOG_WEBHOOK_URL to the Apps Script Web App URL."
              : "Logging is active, but ACTIVITY_LOG_SHEET_VIEW_URL isn't set, so there's nothing to link to here — add the sheet's own share link as that env var."}
          </div>
        )}
      </div>
    </div>
  );
}
