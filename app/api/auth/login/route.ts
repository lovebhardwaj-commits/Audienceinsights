import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { META_OAUTH_DIALOG_BASE, OAUTH_SCOPES } from "@/lib/constants";

export async function GET() {
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback`;
  const url = new URL(META_OAUTH_DIALOG_BASE);
  url.searchParams.set("client_id", process.env.META_APP_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", OAUTH_SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
