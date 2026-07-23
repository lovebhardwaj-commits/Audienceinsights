import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { META_OAUTH_DIALOG_BASE, OAUTH_SCOPES } from "@/lib/constants";
import { validateUser } from "@/lib/auth";
import { getSession } from "@/lib/session";

// POST — email/password login gate (separate from the Meta OAuth flow below,
// which the GET handler still owns unchanged). This is the step that happens
// BEFORE Meta OAuth: a user logs in here first, then connects Meta afterward.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password || !validateUser(email, password)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const session = await getSession();
  session.userEmail = email.trim().toLowerCase();
  await session.save();

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  // Preserve the page the user came from so a re-login returns them to it (spec 4.3).
  // Only same-origin relative paths are honored — guards against open-redirect.
  const returnTo = request.nextUrl.searchParams.get("returnTo");
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    cookieStore.set("oauth_return_to", returnTo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback`;
  const url = new URL(META_OAUTH_DIALOG_BASE);
  url.searchParams.set("client_id", process.env.META_APP_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", OAUTH_SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
