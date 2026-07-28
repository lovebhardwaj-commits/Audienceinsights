"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountSelector } from "./AccountSelector";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { useAccount } from "@/components/providers/AccountProvider";

interface TopBarProps {
  onToggleSidebar?: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const router = useRouter();
  const { tokenExpiringSoon } = useAccount();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div
      className="sticky top-0 z-20"
      style={{
        background: "var(--sidebar-bg)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--sidebar-border)",
      }}
    >
      {tokenExpiringSoon && (
        <div className="flex items-center justify-center gap-3 px-4 py-2 text-sm"
          style={{ background: "rgba(245, 158, 11, 0.1)", borderBottom: "1px solid rgba(245, 158, 11, 0.15)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="font-medium text-amber-400">Your session expires soon.</span>
          <a
            href={`/api/auth/login?returnTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/dashboard")}`}
            className="rounded-lg px-3 py-1 text-xs font-semibold text-white transition-colors"
            style={{ background: "linear-gradient(135deg, #AF46FD, #DA3BC2, #F4349D)" }}
          >
            Re-authenticate
          </a>
        </div>
      )}
      <div className="flex items-center justify-between px-4" style={{ height: "60px" }}>
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-tertiary transition-colors hover:text-ink"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
          <Link href="/dashboard">
            <Logo className="h-7 w-auto text-ink" />
          </Link>
          <div className="mx-2 h-5 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          <AccountSelector />
        </div>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-[10px] px-4 py-2 text-[13px] font-bold text-white transition-opacity hover:opacity-88"
            style={{
              background: "linear-gradient(135deg, #AF46FD, #DA3BC2, #F4349D)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
