import { getReportLog, isActivityLogConfigured } from "@/lib/activity-log";
import { LogTable } from "./LogTable";

// Always read fresh from KV — this page is a live internal dashboard, not a static page.
export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const configured = isActivityLogConfigured();
  const entries = configured ? await getReportLog() : [];

  return (
    <div className="min-h-screen bg-surface-app px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-700 text-sm font-bold text-white">
            A
          </div>
          <div>
            <h1 className="text-lg font-bold text-ink">Ads Reach — Activity Log</h1>
            <p className="text-xs text-ink-tertiary">
              Internal only — not visible to merchants. Every report fetch, success or failure, across all connected accounts.
            </p>
          </div>
        </div>

        {!configured ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            Activity logging isn&apos;t configured yet — add Vercel KV to this project (Storage tab → Create Database → KV) and redeploy.
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-hairline bg-surface-card p-5">
            <LogTable entries={entries} />
          </div>
        )}
      </div>
    </div>
  );
}
