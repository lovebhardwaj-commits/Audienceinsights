import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/** Enters demo mode (Part 8): flags the session so the report routes serve recorded
 *  fixtures with no Meta token, then lands on the dashboard. */
export async function GET(request: Request) {
  const session = await getSession();
  session.demo = true;
  await session.save();
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
