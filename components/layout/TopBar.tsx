"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountSelector } from "./AccountSelector";
import { useAccount } from "@/components/providers/AccountProvider";

function AccountMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Disconnects the connected Meta ad account (destroys the whole session, including
  // the email-auth gate) — the more consequential of the two actions.
  async function handleDisconnectMeta() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  // Clears only the email-auth gate, leaving any connected Meta session untouched —
  // signing back in doesn't require reconnecting Meta.
  async function handleSignOut() {
    await fetch("/api/auth/logout-email", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Account"
        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
          open ? "border-brand-300 bg-brand-50 text-brand-600" : "border-hairline text-ink-secondary hover:bg-slate-50"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
          <button
            onClick={handleDisconnectMeta}
            className="flex w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left transition-colors hover:bg-red-50"
          >
            <span className="text-sm font-medium text-slate-700">Disconnect Meta account</span>
            <span className="text-xs text-slate-400">Ends this session and removes your connected ad account</span>
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={handleSignOut}
            className="flex w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50"
          >
            <span className="text-sm font-medium text-slate-700">Sign out of Ads Reach</span>
            <span className="text-xs text-slate-400">Your Meta connection stays intact for next time</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const { tokenExpiringSoon } = useAccount();

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
        <AccountMenu />
      </div>
    </div>
  );
}
