// Internal-only usage log: "is this merchant actually opening their reports?"
// Every non-demo report fetch (success or failure) gets one row appended to a Google
// Sheet, via a tiny Apps Script Web App acting as a webhook — no database, no paid
// Vercel add-on. Never lets a logging failure affect the report response: every write
// is fire-and-forget and swallows its own errors.

import type { MetaErrorCode } from "@/lib/meta-api";

export interface ReportLogEntry {
  timestamp: number;
  accountId: string;
  reportType: string;
  since?: string;
  until?: string;
  status: "success" | "error";
  errorCode?: MetaErrorCode;
  errorMessage?: string;
  durationMs: number;
}

export function isActivityLogConfigured(): boolean {
  return !!process.env.ACTIVITY_LOG_WEBHOOK_URL;
}

export async function logReportEvent(entry: ReportLogEntry): Promise<void> {
  const url = process.env.ACTIVITY_LOG_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  } catch (err) {
    console.error("Failed to POST activity log entry (non-fatal):", err);
  }
}
