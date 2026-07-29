"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { AccountSelector } from "./AccountSelector";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--sidebar-bg)" }}>
      <TopBar onToggleSidebar={() => setCollapsed((c) => !c)} />
      <div className="flex min-h-0 flex-1">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main
          className="min-w-0 flex-1"
          style={{
            background: "var(--surface-app)",
            borderTopLeftRadius: "12px",
            marginTop: "2px",
          }}
        >
          <div className="flex items-center gap-3 px-6 pt-4 pb-2 lg:px-8">
            <AccountSelector />
          </div>
          <div className="px-6 py-3 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
