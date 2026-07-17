import { NextResponse } from "next/server";
import { getSession, isTokenExpiringSoon } from "@/lib/session";
import { metaGetAllPages, MetaApiError } from "@/lib/meta-api";
import { DEMO_ACCOUNT } from "@/lib/demo-fixtures";
import type { MetaAdAccount } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (session.demo) {
    return NextResponse.json({ accounts: [DEMO_ACCOUNT], tokenExpiringSoon: false });
  }
  if (!session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const accounts = await metaGetAllPages("/me/adaccounts", session.accessToken, {
      fields: "id,name,account_status,currency,business_name",
      limit: "100",
    });
    return NextResponse.json({
      accounts: accounts as MetaAdAccount[],
      tokenExpiringSoon: isTokenExpiringSoon(session.tokenExpiresAt),
    });
  } catch (err) {
    if (err instanceof MetaApiError && err.isAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Failed to load ad accounts";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
