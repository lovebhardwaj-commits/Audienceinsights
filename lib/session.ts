import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { TOKEN_EXPIRY_WARNING_DAYS } from "./constants";

export interface SessionData {
  accessToken?: string;
  tokenExpiresAt?: number; // unix ms
  userName?: string;
  /** Demo mode (Part 8) — serves recorded fixtures through the real routes, no Meta token. */
  demo?: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "ads_reach_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 60, // 60 days
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export function isTokenExpiringSoon(tokenExpiresAt: number | undefined): boolean {
  if (!tokenExpiresAt) return false;
  const warningThreshold = Date.now() + TOKEN_EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000;
  return tokenExpiresAt < warningThreshold;
}

export async function requireSession(): Promise<IronSession<SessionData> & { accessToken: string }> {
  const session = await getSession();
  if (!session.accessToken) {
    throw new Error("UNAUTHENTICATED");
  }
  return session as IronSession<SessionData> & { accessToken: string };
}
