"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { REPORTS } from "@/lib/constants";
import { HomeIcon, REPORT_ICONS } from "./icons";
import { Logo, LogoMark } from "./Logo";

const NAV_SLUGS = [
  "net-new-reach",
  "campaign-overlap",
  "conversion-windows",
  "audience-segments",
  "partnership-ads",
  "frequency",
  "creative-churn",
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  criticalSlugs?: Set<string>;
}

export function Sidebar({ collapsed, onToggle, criticalSlugs }: SidebarProps) {
  const pathname = usePathname();
  const isReportActive = pathname.startsWith("/reports/");
  const [reportsOpen, setReportsOpen] = useState(isReportActive);
  const w = collapsed ? "w-16" : "w-[220px]";

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 self-start flex-col overflow-hidden transition-all duration-200 md:flex ${w}`}
      style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      {/* Logo area */}
      <div className={`flex items-center ${collapsed ? "justify-center px-0 py-4" : "gap-2.5 px-4 py-4"}`}
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        {collapsed ? (
          <Link href="/dashboard" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]">
            <LogoMark className="h-6 w-auto" />
          </Link>
        ) : (
          <div className="flex w-full items-center justify-between">
            <button
              onClick={onToggle}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-tertiary transition-colors hover:text-ink-secondary"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <Link href="/dashboard" className="min-w-0">
              <Logo className="h-7 w-auto text-ink" />
            </Link>
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
        {/* Home / Overview */}
        <SidebarLink href="/dashboard" active={pathname === "/dashboard"} icon={HomeIcon} collapsed={collapsed}>
          Home
        </SidebarLink>

        {/* Reports submenu */}
        {collapsed ? (
          <div className="mt-1 flex flex-col gap-0.5">
            {NAV_SLUGS.map((slug) => {
              const report = REPORTS.find((r) => r.slug === slug);
              if (!report) return null;
              const href = `/reports/${slug}`;
              return (
                <SidebarLink key={slug} href={href} active={pathname === href} icon={REPORT_ICONS[slug]} collapsed critical={criticalSlugs?.has(slug)}>
                  {report.title}
                </SidebarLink>
              );
            })}
          </div>
        ) : (
          <div className="mt-1">
            <button
              onClick={() => setReportsOpen((o) => !o)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                isReportActive ? "text-ink" : "text-ink-secondary hover:text-ink"
              }`}
              style={isReportActive && !reportsOpen ? { background: "rgba(175, 70, 253, 0.08)" } : {}}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isReportActive ? "text-brand-500" : "text-ink-tertiary"}>
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
              <span className="flex-1 truncate text-[13px] font-semibold">Reports</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`text-ink-tertiary transition-transform duration-200 ${reportsOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {reportsOpen && (
              <div className="ml-5 mt-0.5 flex flex-col gap-px border-l" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {NAV_SLUGS.map((slug) => {
                  const report = REPORTS.find((r) => r.slug === slug);
                  if (!report) return null;
                  const href = `/reports/${slug}`;
                  const active = pathname === href;
                  return (
                    <Link
                      key={slug}
                      href={href}
                      className={`group flex items-center gap-2 rounded-lg py-2 pl-4 pr-3 text-[12.5px] font-medium transition-colors ${
                        active ? "font-semibold text-ink" : "text-ink-secondary hover:text-ink"
                      }`}
                      style={active ? { background: "rgba(175, 70, 253, 0.10)" } : {}}
                    >
                      {active && <span className="absolute -left-[1.5px] h-4 w-[3px] rounded-full bg-brand-500" />}
                      <span className="relative truncate">{report.title}</span>
                      {criticalSlugs?.has(slug) && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-sev-critical" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}

function SidebarLink({
  href,
  active,
  icon: Icon,
  collapsed,
  critical,
  children,
}: {
  href: string;
  active: boolean;
  icon: (props: { className?: string }) => React.ReactElement;
  collapsed: boolean;
  critical?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? String(children) : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
        active ? "text-ink" : "text-ink-secondary hover:text-ink"
      } ${collapsed ? "justify-center px-0" : ""}`}
      style={active ? { background: "rgba(175, 70, 253, 0.12)" } : {}}
    >
      <div className={`flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-xl transition-colors ${
        active ? "text-brand-500" : "text-ink-tertiary group-hover:text-ink-secondary"
      }`}
        style={active ? { background: "rgba(175, 70, 253, 0.15)" } : {}}
      >
        <Icon className="h-[17px] w-[17px]" />
        {critical && collapsed && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-sev-critical" style={{ border: "2px solid var(--sidebar-bg)" }} />
        )}
      </div>
      {!collapsed && (
        <div className="flex min-w-0 flex-1 items-center justify-between">
          <span className={`truncate text-[13px] font-semibold ${active ? "text-ink" : ""}`}>
            {children}
          </span>
          {critical && <span className="ml-1.5 h-2 w-2 shrink-0 rounded-full bg-sev-critical" />}
        </div>
      )}
    </Link>
  );
}
