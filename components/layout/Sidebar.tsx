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

const COLLAPSED_LABELS: Record<string, string> = {
  "net-new-reach": "Reach",
  "campaign-overlap": "Overlap",
  "conversion-windows": "Windows",
  "audience-segments": "Segments",
  "partnership-ads": "Partners",
  "frequency": "Frequency",
  "creative-churn": "Churn",
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  criticalSlugs?: Set<string>;
}

export function Sidebar({ collapsed, onToggle, criticalSlugs }: SidebarProps) {
  const pathname = usePathname();
  const isReportActive = pathname.startsWith("/reports/");
  const [reportsOpen, setReportsOpen] = useState(isReportActive);
  const w = collapsed ? "w-[84px]" : "w-[220px]";

  return (
    <aside
      className={`sticky top-[60px] hidden h-[calc(100vh-60px)] shrink-0 self-start flex-col overflow-hidden transition-all duration-200 md:flex ${w}`}
      style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
        {/* Home */}
        <CollapsibleLink href="/dashboard" active={pathname === "/dashboard"} icon={HomeIcon} collapsed={collapsed} label="Home" />

        {/* Reports */}
        {collapsed ? (
          <div className="mt-1 flex flex-col gap-0.5">
            {NAV_SLUGS.map((slug) => {
              const report = REPORTS.find((r) => r.slug === slug);
              if (!report) return null;
              const href = `/reports/${slug}`;
              return (
                <CollapsibleLink
                  key={slug}
                  href={href}
                  active={pathname === href}
                  icon={REPORT_ICONS[slug]}
                  collapsed
                  label={COLLAPSED_LABELS[slug] ?? report.title}
                />
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
                {NAV_SLUGS.map((slug, i) => {
                  const report = REPORTS.find((r) => r.slug === slug);
                  if (!report) return null;
                  const href = `/reports/${slug}`;
                  const active = pathname === href;
                  const isLast = i === NAV_SLUGS.length - 1;
                  return (
                    <div key={slug} className="relative flex items-center" style={{ minHeight: "32px" }}>
                      {/* Vertical line segment — runs from top to center of this row */}
                      {!isLast && (
                        <div
                          className="absolute left-0"
                          style={{
                            width: "1px",
                            top: 0,
                            bottom: 0,
                            background: "rgba(255,255,255,0.10)",
                          }}
                        />
                      )}
                      {isLast && (
                        <div
                          className="absolute left-0 top-0"
                          style={{
                            width: "1px",
                            height: "50%",
                            background: "rgba(255,255,255,0.10)",
                          }}
                        />
                      )}
                      {/* Curved connector: vertical to horizontal with border-radius */}
                      <div
                        className="absolute"
                        style={{
                          left: 0,
                          top: "50%",
                          width: "12px",
                          height: "0",
                          borderBottom: "1px solid rgba(255,255,255,0.10)",
                          borderLeft: "none",
                          borderBottomLeftRadius: "0",
                        }}
                      />
                      {/* Curved L-connector */}
                      <div
                        className="absolute"
                        style={{
                          left: "-0.5px",
                          top: "calc(50% - 8px)",
                          width: "12px",
                          height: "8px",
                          borderLeft: "1px solid rgba(255,255,255,0.10)",
                          borderBottom: "1px solid rgba(255,255,255,0.10)",
                          borderBottomLeftRadius: "8px",
                          borderRight: "none",
                          borderTop: "none",
                        }}
                      />
                      <Link
                        href={href}
                        className={`ml-[16px] flex flex-1 items-center gap-2 rounded-lg py-[7px] pl-2 pr-3 text-[12.5px] font-medium transition-colors ${
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

function CollapsibleLink({
  href,
  active,
  icon: Icon,
  collapsed,
  label,
}: {
  href: string;
  active: boolean;
  icon: (props: { className?: string }) => React.ReactElement;
  collapsed: boolean;
  label: string;
}) {
  if (collapsed) {
    return (
      <Link
        href={href}
        className={`group relative flex flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors ${
          active ? "text-ink" : "text-ink-secondary hover:text-ink"
        }`}
      >
        <div
          className={`flex h-[38px] w-[38px] items-center justify-center rounded-xl transition-colors ${
            active ? "text-brand-500" : "text-ink-tertiary group-hover:text-ink-secondary"
          }`}
          style={active ? { background: "rgba(175, 70, 253, 0.15)" } : {}}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <span className={`text-[10px] font-medium ${active ? "text-ink" : "text-ink-tertiary"}`}>
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
        active ? "text-ink" : "text-ink-secondary hover:text-ink"
      }`}
      style={active ? { background: "rgba(175, 70, 253, 0.12)" } : {}}
    >
      <div
        className={`flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-xl transition-colors ${
          active ? "text-brand-500" : "text-ink-tertiary group-hover:text-ink-secondary"
        }`}
        style={active ? { background: "rgba(175, 70, 253, 0.15)" } : {}}
      >
        <Icon className="h-[17px] w-[17px]" />
      </div>
      <span className={`truncate text-[13px] font-semibold ${active ? "text-ink" : ""}`}>
        {label}
      </span>
    </Link>
  );
}
