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
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div
        className="flex min-w-0 flex-1 flex-col transition-all duration-200"
        style={{ marginLeft: 0 }}
      >
        <TopBar onToggleSidebar={() => setCollapsed((c) => !c)} sidebarCollapsed={collapsed} />
        <main className="min-w-0 flex-1 px-6 py-5 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
