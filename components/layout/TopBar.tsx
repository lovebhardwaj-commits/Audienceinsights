"use client";

import { useRouter } from "next/navigation";
import { AccountSelector } from "./AccountSelector";
import { useAccount } from "@/components/providers/AccountProvider";

interface TopBarProps {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

export function TopBar({ onToggleSidebar, sidebarCollapsed }: TopBarProps) {
  const router = useRouter();
  const { tokenExpiringSoon } = useAccount();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="border-b border-slate-200/80 bg-white">
      {tokenExpiringSoon && (
        <div className="flex items-center justify-center gap-3 bg-amber-50 px-4 py-2 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="font-medium text-amber-800">Your session expires soon.</span>
          <a
            href="/api/auth/login"
            className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
          >
            Re-authenticate
          </a>
        </div>
      )}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Sidebar toggle — always visible, prominent */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
            >
              {sidebarCollapsed ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>
                </svg>
              )}
            </button>
          )}
          <AccountSelector />
        </div>
        {/* [PM ENHANCEMENT] — destructive action signals red on hover, not neutral gray */}
        <button
          onClick={handleLogout}
          className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
