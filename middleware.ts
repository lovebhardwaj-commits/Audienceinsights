import { NextResponse, type NextRequest } from "next/server";
import { unsealData } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

// No middleware.ts existed before this — route protection was previously only a
// server-component check in app/(app)/layout.tsx, which doesn't cover the root
// landing page or any /api/* route. This is genuinely new, not a modification.
//
// Runs on the Edge runtime, so it can't use lib/session.ts's getSession() (which
// depends on next/headers' cookies(), meant for Server Components/Route Handlers).
// iron-session v8 exports unsealData() as a standalone primitive backed by
// iron-webcrypto/uncrypto (Web Crypto, not Node crypto) specifically so it works
// outside Node — reading the raw cookie via NextRequest and unsealing it here is
// the supported edge-compatible pattern.
// /logs is the internal-team activity log — intentionally public (no login), so it can
// be shared as a plain link without handing out the merchant-facing email/password gate.
const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/logs"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(sessionOptions.cookieName)?.value;
  let userEmail: string | undefined;
  if (cookie) {
    try {
      const data = await unsealData<SessionData>(cookie, { password: sessionOptions.password });
      userEmail = data.userEmail;
    } catch {
      // Malformed/tampered/foreign cookie — treat as logged out rather than crash.
      userEmail = undefined;
    }
  }

  if (!userEmail) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Every request except static assets and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
