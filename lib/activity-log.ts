// Internal-only usage log: "is this merchant actually opening their reports?"
// Every non-demo report fetch (success or failure) gets one entry. Backed by Vercel KV
// so it survives across requests — this app otherwise has no database. Never lets a
// logging failure affect the report response: every write is best-effort and swallows
// its own errors.

import { kv } from "@vercel/kv";
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

const LOG_KEY = "report-activity-log";
const MAX_ENTRIES = 2000;

function kvConfigured(): boolean {
  return !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;
}

export async function logReportEvent(entry: ReportLogEntry): Promise<void> {
  if (!kvConfigured()) return;
  try {
    await kv.lpush(LOG_KEY, JSON.stringify(entry));
    await kv.ltrim(LOG_KEY, 0, MAX_ENTRIES - 1);
  } catch (err) {
    console.error("Failed to write activity log entry (non-fatal):", err);
  }
}

export async function getReportLog(limit = 500): Promise<ReportLogEntry[]> {
  if (!kvConfigured()) return [];
  try {
    const raw = await kv.lrange<string>(LOG_KEY, 0, limit - 1);
    return raw.map((r) => JSON.parse(r) as ReportLogEntry);
  } catch (err) {
    console.error("Failed to read activity log (non-fatal):", err);
    return [];
  }
}

export function isActivityLogConfigured(): boolean {
  return kvConfigured();
}
