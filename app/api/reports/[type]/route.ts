import { NextRequest, NextResponse } from "next/server";
import { getSession, isTokenExpiringSoon } from "@/lib/session";
import { MetaApiError } from "@/lib/meta-api";
import { ndjsonResponse } from "@/lib/stream";
import { getAudienceSegmentsReport } from "@/lib/reports/audience-segments";
import { getCreativeChurnReport } from "@/lib/reports/creative-churn";
import { getCreativeSegmentsReport, type EntityLevel } from "@/lib/reports/creative-segments";
import { getConversionWindowsReport } from "@/lib/reports/conversion-windows";
import { getPartnershipAdsReport } from "@/lib/reports/partnership-ads";
import { getRollingReachReport } from "@/lib/reports/rolling-reach";
import { getNetNewReachReport } from "@/lib/reports/net-new-reach";
import { getCampaignOverlapReport, type OverlapLevel } from "@/lib/reports/campaign-overlap";
import { fetchCampaignList } from "@/lib/reports/shared";

export const maxDuration = 120;

type RouteContext = { params: Promise<{ type: string }> };

const STREAMING_TYPES = new Set([
  "rolling-reach",
  "net-new-reach",
  "campaign-overlap",
]);

export async function GET(request: NextRequest, context: RouteContext) {
  const { type } = await context.params;
  const session = await getSession();
  if (!session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const token = session.accessToken;

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }
  const since = searchParams.get("since");
  const until = searchParams.get("until");
  const range = since && until ? { since, until } : null;

  if (STREAMING_TYPES.has(type)) {
    if (!range) return NextResponse.json({ error: "since and until are required" }, { status: 400 });
    return ndjsonResponse((emit) => runStreamingReport(type, token, accountId, range, searchParams, emit));
  }

  try {
    const data = await runJsonReport(type, token, accountId, range, searchParams);
    return NextResponse.json({ data, tokenExpiringSoon: isTokenExpiringSoon(session.tokenExpiresAt) });
  } catch (err) {
    if (err instanceof MetaApiError && err.isAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error(`Report "${type}" failed:`, err);
    const message = err instanceof Error ? err.message : "Report failed";
    return NextResponse.json({ error: message }, { status: 502 });
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
    case "creative-churn": {
      requireRange(range);
      return getCreativeChurnReport(token, accountId, range);
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
  emit: (progress: { current: number; total: number; label: string }) => void
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
      return getCampaignOverlapReport(token, accountId, range, { level, topN, minReach: 1000 }, emit);
    }
    default:
      throw new NotFoundError(`Unknown streaming report type: ${type}`);
  }
}

class NotFoundError extends Error {}

function requireRange(range: { since: string; until: string } | null): asserts range is { since: string; until: string } {
  if (!range) throw new Error("since and until are required");
}
