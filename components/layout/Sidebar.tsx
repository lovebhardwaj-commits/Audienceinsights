"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { REPORTS } from "@/lib/constants";
import { HomeIcon, REPORT_ICONS } from "./icons";

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
      className={`sticky top-[60px] hidden h-[calc(100vh-60px)] shrink-0 self-start flex-col overflow-hidden transition-all duration-200 md:flex ${w}`}
      style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
        {/* Home */}
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
              <div className="relative ml-[26px] mt-0.5 flex flex-col">
                {/* Vertical tree line */}
                <div
                  className="absolute left-0 top-0"
                  style={{
                    width: "1px",
                    height: "calc(100% - 16px)",
                    background: "rgba(255,255,255,0.10)",
                  }}
                />
                {NAV_SLUGS.map((slug, i) => {
                  const report = REPORTS.find((r) => r.slug === slug);
                  if (!report) return null;
                  const href = `/reports/${slug}`;
                  const active = pathname === href;
                  const isLast = i === NAV_SLUGS.length - 1;
                  return (
                    <div key={slug} className="relative flex items-center">
                      {/* Horizontal branch */}
                      <div
                        className="absolute left-0"
                        style={{
                          width: "14px",
                          height: "1px",
                          top: "50%",
                          background: "rgba(255,255,255,0.10)",
                        }}
                      />
                      {/* Corner for last item */}
                      {isLast && (
                        <div
                          className="absolute left-0"
                          style={{
                            width: "1px",
                            top: "50%",
                            bottom: 0,
                            background: "var(--sidebar-bg)",
                          }}
                        />
                      )}
                      <Link
                        href={href}
                        className={`ml-[18px] flex flex-1 items-center gap-2 rounded-lg py-[7px] pl-2 pr-3 text-[12.5px] font-medium transition-colors ${
                          active ? "font-semibold text-ink" : "text-ink-secondary hover:text-ink"
                        }`}
                        style={active ? { background: "rgba(175, 70, 253, 0.10)" } : {}}
                      >
                        <span className="truncate">{report.title}</span>
                        {criticalSlugs?.has(slug) && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-sev-critical" />}
                      </Link>
                    </div>
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
