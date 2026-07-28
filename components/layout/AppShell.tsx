"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

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
          className="min-w-0 flex-1 px-6 py-5 lg:px-8"
          style={{
            background: "var(--surface-app)",
            borderTopLeftRadius: "12px",
            marginTop: "2px",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
