import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// Separate from the existing /api/auth/logout (which destroys the whole session,
// including the Meta accessToken, for the pre-existing TopBar "Log out" control).
// This one only clears the email-auth gate, leaving any connected Meta session
// untouched — logging out of the app doesn't force reconnecting Meta.
export async function POST() {
  const session = await getSession();
  session.userEmail = undefined;
  await session.save();
  return NextResponse.json({ ok: true });
}
