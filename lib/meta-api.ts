import { META_GRAPH_BASE } from "./constants";
import type { ApiFiltering } from "./types";

export class MetaApiError extends Error {
  code?: number;
  fbtraceId?: string;
  isAuthError: boolean;

  constructor(message: string, code?: number, fbtraceId?: string) {
    super(message);
    this.name = "MetaApiError";
    this.code = code;
    this.fbtraceId = fbtraceId;
    // 190 = OAuthException (expired/invalid token)
    this.isAuthError = code === 190;
  }
}

const RETRYABLE_ERROR_CODES = new Set([4, 17]);
const MAX_RETRIES = 3;
const THROTTLE_PAUSE_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readThrottleHeader(headers: Headers): { app_id_util_pct?: number; acc_id_util_pct?: number } | null {
  const raw = headers.get("x-fb-ads-insights-throttle") || headers.get("x-business-use-case-usage");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fetchJson(url: string, attempt = 0): Promise<any> {
  const res = await fetch(url, { cache: "no-store" });
  const throttle = readThrottleHeader(res.headers);
  if (throttle) {
    const maxPct = Math.max(throttle.app_id_util_pct ?? 0, throttle.acc_id_util_pct ?? 0);
    if (maxPct > 75) await sleep(THROTTLE_PAUSE_MS);
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new MetaApiError(`Meta API returned a non-JSON response (HTTP ${res.status})`);
  }

  if (!res.ok || json.error) {
    const err = json.error || {};
    if (RETRYABLE_ERROR_CODES.has(err.code) && attempt < MAX_RETRIES) {
      await sleep(1000 * 2 ** attempt);
      return fetchJson(url, attempt + 1);
    }
    throw new MetaApiError(err.message || `Meta API error (HTTP ${res.status})`, err.code, err.fbtrace_id);
  }

  return json;
}

function buildUrl(path: string, token: string, params: Record<string, string>): string {
  const url = new URL(path.startsWith("http") ? path : `${META_GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", token);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function metaGet(path: string, token: string, params: Record<string, string> = {}): Promise<any> {
  return fetchJson(buildUrl(path, token, params));
}

/** Follows paging.next until exhausted; returns the concatenated `data` array. */
export async function metaGetAllPages(
  path: string,
  token: string,
  params: Record<string, string> = {}
): Promise<any[]> {
  const results: any[] = [];
  let json = await metaGet(path, token, params);
  results.push(...(json.data || []));
  let next = json.paging?.next;
  while (next) {
    json = await fetchJson(next);
    results.push(...(json.data || []));
    next = json.paging?.next;
  }
  return results;
}

export interface MetaInsightsParams {
  token: string;
  /** act_XXXXXXXXX for account-level queries, or a campaign/adset/ad ID for entity-level queries. */
  objectId: string;
  fields: string[];
  timeRange?: { since: string; until: string };
  level?: "campaign" | "adset" | "ad";
  breakdowns?: string;
  filtering?: ApiFiltering[];
  timeIncrement?: number | "monthly";
  limit?: number;
  actionAttributionWindows?: string[];
}

export async function metaInsights(params: MetaInsightsParams): Promise<any[]> {
  const {
    token,
    objectId,
    fields,
    timeRange,
    level,
    breakdowns,
    filtering,
    timeIncrement,
    limit = 500,
    actionAttributionWindows,
  } = params;

  const query: Record<string, string> = {
    fields: fields.join(","),
    limit: String(limit),
  };
  if (timeRange) query.time_range = JSON.stringify(timeRange);
  if (level) query.level = level;
  if (breakdowns) query.breakdowns = breakdowns;
  if (filtering) query.filtering = JSON.stringify(filtering);
  if (timeIncrement) query.time_increment = String(timeIncrement);
  if (actionAttributionWindows) query.action_attribution_windows = JSON.stringify(actionAttributionWindows);

  return metaGetAllPages(`/${objectId}/insights`, token, query);
}

export interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

function buildOAuthUrl(params: Record<string, string>): string {
  const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<TokenResponse> {
  return fetchJson(
    buildOAuthUrl({
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      redirect_uri: redirectUri,
      code,
    })
  );
}

export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<TokenResponse> {
  return fetchJson(
    buildOAuthUrl({
      grant_type: "fb_exchange_token",
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      fb_exchange_token: shortLivedToken,
    })
  );
}
