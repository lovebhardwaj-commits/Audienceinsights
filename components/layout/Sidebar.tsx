"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { REPORTS } from "@/lib/constants";
import { HomeIcon, REPORT_ICONS } from "./icons";

// creative-churn temporarily hidden — timing out on 5-6 month ranges (heaviest
// report: full ad list + daily-granularity insights). Re-add once fixed.
const NAV_SLUGS = [
  "net-new-reach",
  "campaign-overlap",
  "conversion-windows",
  "audience-segments",
  "creative-segments",
  "partnership-ads",
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const w = collapsed ? "w-[56px]" : "w-[240px]";

  return (
    <aside
      className={`hidden shrink-0 border-r border-slate-200/80 bg-white md:flex md:flex-col transition-all duration-200 ${w} overflow-hidden`}
    >
      {/* Logo */}
      <div className={`flex items-center border-b border-slate-100 ${collapsed ? "justify-center px-0 py-4" : "gap-2.5 px-4 py-4"}`}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-700 text-sm font-bold text-white shadow-sm">
          A
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <Link href="/dashboard" className="text-[14px] font-bold tracking-tight text-slate-900">
              Ads Reach
            </Link>
            <div className="text-[10px] text-slate-400">Reach Intelligence</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col overflow-y-auto py-3 px-2">
        <SidebarLink href="/dashboard" active={pathname === "/dashboard"} icon={HomeIcon} description="Overview & quick access" collapsed={collapsed}>
          Overview
        </SidebarLink>

        <div className="mt-3">
          {NAV_SLUGS.map((slug) => {
            const report = REPORTS.find((r) => r.slug === slug);
            if (!report) return null;
            const href = `/reports/${slug}`;
            return (
              <SidebarLink key={slug} href={href} active={pathname === href} icon={REPORT_ICONS[slug]} description={report.description} collapsed={collapsed}>
                {report.title}
              </SidebarLink>
            );
          })}
        </div>
      </nav>

      {/* Metrics Guide */}
      <div className="px-2 pb-1">
        <a
          href="/metrics-guide.html"
          target="_blank"
          rel="noopener noreferrer"
          title="Metrics Guide"
          className={`group flex items-center gap-2.5 rounded-lg px-2 py-2 text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 ${collapsed ? "justify-center" : ""}`}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition-colors group-hover:bg-slate-200 group-hover:text-slate-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 items-center justify-between">
              <div>
                <div className="truncate text-[13px] font-semibold leading-tight text-slate-700">Metrics Guide</div>
                <div className="mt-0.5 truncate text-[11px] leading-tight text-slate-400">Every metric explained</div>
              </div>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-300">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </div>
          )}
        </a>
      </div>

      {/* Toggle + footer */}
      <div className="border-t border-slate-100 px-2 py-2">
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            {collapsed ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            )}
          </span>
          {!collapsed && <span className="text-[11px] font-medium">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  active,
  icon: Icon,
  description,
  collapsed,
  children,
}: {
  href: string;
  active: boolean;
  icon: (props: { className?: string }) => React.ReactElement;
  description?: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? String(children) : undefined}
      className={`group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-all ${
        active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"
      } ${collapsed ? "justify-center" : ""}`}
    >
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
        active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-500"
      }`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className={`truncate text-[13px] font-semibold leading-tight ${active ? "text-brand-700" : "text-slate-700"}`}>
            {children}
          </div>
          {description && (
            <div className={`mt-0.5 truncate text-[11px] leading-tight ${active ? "text-brand-500" : "text-slate-400"}`}>
              {description}
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
