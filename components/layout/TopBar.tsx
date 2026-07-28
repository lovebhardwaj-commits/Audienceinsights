"use client";

import { useRouter } from "next/navigation";
import { AccountSelector } from "./AccountSelector";
import { ThemeToggle } from "./ThemeToggle";
import { useAccount } from "@/components/providers/AccountProvider";

export function TopBar() {
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
        background: "rgba(11, 11, 20, 0.98)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border-hairline)",
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
      <div className="flex items-center justify-between px-7" style={{ height: "60px" }}>
        <div className="flex items-center gap-3">
          <AccountSelector />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-ink-secondary transition-colors hover:text-ink"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
