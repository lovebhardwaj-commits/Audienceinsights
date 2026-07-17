import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken, exchangeForLongLivedToken } from "@/lib/meta-api";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorDescription = url.searchParams.get("error_description");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("oauth_state")?.value;
  cookieStore.delete("oauth_state");
  const returnToRaw = cookieStore.get("oauth_return_to")?.value;
  cookieStore.delete("oauth_return_to");
  // Re-validate the stored path (defense in depth against open-redirect).
  const returnTo = returnToRaw && returnToRaw.startsWith("/") && !returnToRaw.startsWith("//") ? returnToRaw : "/dashboard";

  if (errorDescription) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(errorDescription)}`, request.url));
  }
  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/?error=Invalid+OAuth+state", request.url));
  }

  try {
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback`;
    const shortLived = await exchangeCodeForToken(code, redirectUri);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);

    const session = await getSession();
    session.accessToken = longLived.access_token;
    session.tokenExpiresAt = Date.now() + (longLived.expires_in ?? 60 * 24 * 60 * 60) * 1000;
    await session.save();

    return NextResponse.redirect(new URL(returnTo, request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(message)}`, request.url));
  }
}
