import { NextRequest, NextResponse } from "next/server";
import { getSession, isTokenExpiringSoon } from "@/lib/session";
import { MetaApiError, type MetaErrorCode } from "@/lib/meta-api";
import { ndjsonResponse } from "@/lib/stream";
import { getAudienceSegmentsReport } from "@/lib/reports/audience-segments";
import { getCreativeChurnReport, type ChurnGranularity } from "@/lib/reports/creative-churn";
import { getCreativeSegmentsReport, type EntityLevel } from "@/lib/reports/creative-segments";
import { getConversionWindowsReport } from "@/lib/reports/conversion-windows";
import { getPartnershipAdsReport } from "@/lib/reports/partnership-ads";
import { getFrequencyReport, type FrequencyLevel } from "@/lib/reports/frequency";
import { getRollingReachReport } from "@/lib/reports/rolling-reach";
import { getNetNewReachReport } from "@/lib/reports/net-new-reach";
import { getPulseReport } from "@/lib/reports/pulse";
import { demoFixture } from "@/lib/demo-fixtures";
import { getCampaignOverlapReport, type OverlapLevel } from "@/lib/reports/campaign-overlap";
import { fetchCampaignList } from "@/lib/reports/shared";

export const maxDuration = 120;

type RouteContext = { params: Promise<{ type: string }> };

const STREAMING_TYPES = new Set([
  "rolling-reach",
  "net-new-reach",
  "campaign-overlap",
  "creative-churn",
]);

export async function GET(request: NextRequest, context: RouteContext) {
  const { type } = await context.params;
  const session = await getSession();

  const searchParams = request.nextUrl.searchParams;
  const since = searchParams.get("since");
  const until = searchParams.get("until");
  const range = since && until ? { since, until } : null;

  // Demo mode (Part 8): serve recorded fixtures through this same route, no token.
  if (session.demo) {
    const fixture = demoFixture(type, range ?? undefined);
    if (fixture === null) return NextResponse.json({ error: `No demo fixture for ${type}`, code: "UNKNOWN" }, { status: 404 });
    if (STREAMING_TYPES.has(type)) {
      return ndjsonResponse(async (emit, emitPartial) => {
        // Replay per-entity partials so progressive streaming still demos (D2).
        const entities = (fixture as { entities?: unknown[] }).entities;
        if (Array.isArray(entities)) {
          entities.forEach((e, i) => { emit({ current: i + 1, total: entities.length, label: `Loading demo entity ${i + 1}…` }); emitPartial(e); });
        }
        return fixture;
      });
    }
    return NextResponse.json({ data: fixture, tokenExpiringSoon: false });
  }

  if (!session.accessToken) {
    return NextResponse.json({ error: "Not authenticated", code: "META_AUTH" }, { status: 401 });
  }
  const token = session.accessToken;

  const accountId = searchParams.get("accountId");
  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  if (STREAMING_TYPES.has(type)) {
    if (!range) return NextResponse.json({ error: "since and until are required", code: "UNKNOWN" }, { status: 400 });
    return ndjsonResponse((emit, emitPartial) => runStreamingReport(type, token, accountId, range, searchParams, emit, emitPartial));
  }

  try {
    const data = await runJsonReport(type, token, accountId, range, searchParams);
    return NextResponse.json({ data, tokenExpiringSoon: isTokenExpiringSoon(session.tokenExpiresAt) });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message, code: "UNKNOWN" }, { status: 404 });
    }
    const { code, message } = classifyError(err);
    if (code !== "META_AUTH") console.error(`Report "${type}" failed [${code}]:`, err);
    return NextResponse.json({ error: message, code }, { status: httpStatusForCode(code) });
  }
}

/** Maps any thrown error to the structured taxonomy the client understands (D1).
 *  Only genuine OAuth failures become META_AUTH — timeouts and rate limits never do. */
export function classifyError(err: unknown): { code: MetaErrorCode; message: string } {
  if (err instanceof MetaApiError) {
    return { code: err.errorCode, message: err.message };
  }
  if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return { code: "TIMEOUT", message: "This report took too long to compute." };
  }
  const message = err instanceof Error ? err.message : "Report failed";
  return { code: "UNKNOWN", message };
}

function httpStatusForCode(code: MetaErrorCode): number {
  switch (code) {
    case "META_AUTH":
      return 401;
    case "META_RATE_LIMIT":
      return 429;
    case "TIMEOUT":
      return 504;
    default:
      return 502;
  }
}

async function runJsonReport(
  type: string,
  token: string,
  accountId: string,
  range: { since: string; until: string } | null,
  searchParams: URLSearchParams
): Promise<unknown> {
  switch (type) {
    case "campaign-list":
      return fetchCampaignList(token, accountId);
    case "audience-segments": {
      requireRange(range);
      return getAudienceSegmentsReport(token, accountId, range);
    }
    case "creative-segments": {
      requireRange(range);
      const entityLevel = (searchParams.get("level") as EntityLevel) ?? "ad";
      return getCreativeSegmentsReport(token, accountId, range, entityLevel);
    }
    case "conversion-windows": {
      requireRange(range);
      return getConversionWindowsReport(token, accountId, range);
    }
    case "partnership-ads": {
      requireRange(range);
      return getPartnershipAdsReport(token, accountId, range);
    }
    case "frequency": {
      requireRange(range);
      const level = (searchParams.get("level") ?? "campaign") as FrequencyLevel;
      return getFrequencyReport(token, accountId, range, level);
    }
    case "pulse": {
      requireRange(range);
      return getPulseReport(token, accountId, range);
    }
    default:
      throw new NotFoundError(`Unknown report type: ${type}`);
  }
}

async function runStreamingReport(
  type: string,
  token: string,
  accountId: string,
  range: { since: string; until: string },
  searchParams: URLSearchParams,
  emit: (progress: { current: number; total: number; label: string }) => void,
  emitPartial: (item: unknown) => void
): Promise<unknown> {
  switch (type) {
    case "rolling-reach":
      return getRollingReachReport(token, accountId, range, emit);
    case "net-new-reach": {
      const lookbackDays = Number(searchParams.get("lookbackDays") ?? 180);
      return getNetNewReachReport(token, accountId, range, lookbackDays, emit);
    }
    case "campaign-overlap": {
      const level = (searchParams.get("level") as OverlapLevel) ?? "campaign";
      const topN = Number(searchParams.get("topN") ?? 15);
      return getCampaignOverlapReport(token, accountId, range, { level, topN, minReach: 1000 }, emit, emitPartial);
    }
    case "creative-churn": {
      const granularity = (searchParams.get("granularity") as ChurnGranularity) ?? "weekly";
      const topN = Number(searchParams.get("topN") ?? 8);
      return getCreativeChurnReport(token, accountId, range, { granularity, topN }, emit);
    }
    default:
      throw new NotFoundError(`Unknown streaming report type: ${type}`);
  }
}

class NotFoundError extends Error {}

function requireRange(range: { since: string; until: string } | null): asserts range is { since: string; until: string } {
  if (!range) throw new Error("since and until are required");
}
