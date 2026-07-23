"use client";

import { useRouter } from "next/navigation";
import { AccountSelector } from "./AccountSelector";
import { useAccount } from "@/components/providers/AccountProvider";

export function TopBar() {
  const router = useRouter();
  const { tokenExpiringSoon } = useAccount();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  // Separate from handleLogout above (which disconnects Meta) — this only clears
  // the email-auth gate, so it's a distinct control rather than folded into the
  // existing "Log out" button.
  async function handleLogoutOfApp() {
    await fetch("/api/auth/logout-email", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    // Sticky so it never scrolls away (Part 1).
    <div className="sticky top-0 z-20 border-b border-hairline bg-surface-card">
      {tokenExpiringSoon && (
        <div className="flex items-center justify-center gap-3 bg-amber-50 px-4 py-2 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="font-medium text-amber-800">Your session expires soon.</span>
          <a
            href={`/api/auth/login?returnTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/dashboard")}`}
            className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
          >
            Re-authenticate
          </a>
        </div>
      )}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <AccountSelector />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogoutOfApp}
            className="rounded-lg border border-hairline px-3.5 py-1.5 text-sm font-medium text-ink-secondary transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Log out of app
          </button>
          {/* [PM ENHANCEMENT] — destructive action signals red on hover, not neutral gray */}
          <button
            onClick={handleLogout}
            className="rounded-lg border border-hairline px-3.5 py-1.5 text-sm font-medium text-ink-secondary transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
