"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { REPORTS } from "@/lib/constants";
import { HomeIcon, REPORT_ICONS } from "./icons";

// Frequency (D7/7.6) and Creative Churn (7.7) are both back in nav after their fixes.
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
  /** Report slugs with a critical finding — render a red attention dot (Part 1.3, Phase 4). */
  criticalSlugs?: Set<string>;
}

export function Sidebar({ collapsed, onToggle, criticalSlugs }: SidebarProps) {
  const pathname = usePathname();
  const w = collapsed ? "w-[72px]" : "w-[260px]";

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 self-start flex-col overflow-hidden border-r border-hairline bg-surface-card transition-all duration-200 md:flex ${w}`}
    >
      {/* Header: wordmark + collapse chevron (Part 1) */}
      <div className={`flex items-center border-b border-hairline ${collapsed ? "flex-col gap-2 px-0 py-4" : "gap-2.5 px-4 py-4"}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-700 text-sm font-bold text-white">
            A
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <Link href="/dashboard" className="text-[14px] font-bold tracking-tight text-ink">
                Ads Reach
              </Link>
              <div className="text-[10px] text-ink-tertiary">Reach Intelligence</div>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-ink-tertiary transition-colors hover:bg-surface-app hover:text-ink-secondary ${collapsed ? "" : "ml-auto"}`}
        >
          {collapsed ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
        <SidebarLink href="/dashboard" active={pathname === "/dashboard"} icon={HomeIcon} description="Overview & quick access" collapsed={collapsed}>
          Overview
        </SidebarLink>

        <div className="mt-3 flex flex-col gap-0.5">
          {NAV_SLUGS.map((slug) => {
            const report = REPORTS.find((r) => r.slug === slug);
            if (!report) return null;
            const href = `/reports/${slug}`;
            return (
              <SidebarLink
                key={slug}
                href={href}
                active={pathname === href}
                icon={REPORT_ICONS[slug]}
                description={report.description}
                collapsed={collapsed}
                critical={criticalSlugs?.has(slug)}
              >
                {report.title}
              </SidebarLink>
            );
          })}
        </div>
      </nav>

      {/* Footer: Metrics Guide, pinned */}
      <div className="border-t border-hairline px-2 py-2">
        <a
          href="/metrics-guide.html"
          target="_blank"
          rel="noopener noreferrer"
          title="Metrics Guide"
          className={`group flex items-center gap-2.5 rounded-lg px-2 py-2 text-ink-secondary transition-all hover:bg-surface-app ${collapsed ? "justify-center" : ""}`}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-app text-ink-tertiary transition-colors group-hover:text-ink-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 items-center justify-between">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold leading-tight text-ink-secondary">Metrics Guide</div>
                <div className="mt-0.5 truncate text-[11px] leading-tight text-ink-tertiary">Every metric explained</div>
              </div>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-tertiary">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </div>
          )}
        </a>
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
  critical,
  children,
}: {
  href: string;
  active: boolean;
  icon: (props: { className?: string }) => React.ReactElement;
  description?: string;
  collapsed: boolean;
  critical?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? String(children) : undefined}
      className={`group relative flex items-center gap-2.5 rounded-lg px-2 py-2 transition-all ${
        active ? "bg-brand-50 text-brand-700" : "text-ink-secondary hover:bg-surface-app"
      } ${collapsed ? "justify-center" : ""}`}
    >
      <div className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
        active ? "bg-brand-600 text-white" : "bg-surface-app text-ink-tertiary group-hover:text-ink-secondary"
      }`}>
        <Icon className="h-3.5 w-3.5" />
        {/* Attention dot — a critical finding for this report (Part 1.3). Shown on the
            icon when collapsed so the triage signal survives the icon-only rail. */}
        {critical && collapsed && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-surface-card bg-sev-critical" />
        )}
      </div>
      {!collapsed && (
        <div className="flex min-w-0 flex-1 items-center justify-between">
          <div className="min-w-0">
            <div className={`truncate text-[13px] font-semibold leading-tight ${active ? "text-brand-700" : "text-ink"}`}>
              {children}
            </div>
            {description && (
              <div className={`mt-0.5 truncate text-[11px] leading-tight ${active ? "text-brand-500" : "text-ink-tertiary"}`}>
                {description}
              </div>
            )}
          </div>
          {critical && <span className="ml-1.5 h-2 w-2 shrink-0 rounded-full bg-sev-critical" title="Critical finding" />}
        </div>
      )}
    </Link>
  );
}
