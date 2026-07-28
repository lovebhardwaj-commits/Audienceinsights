"use client";

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
  const w = collapsed ? "w-16" : "w-[260px]";

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 self-start flex-col overflow-hidden transition-all duration-200 md:flex ${w}`}
      style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      <div className={`flex items-center ${collapsed ? "flex-col gap-2 px-0 py-4" : "gap-2.5 px-4 py-4"}`}
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {collapsed ? (
            <Link href="/dashboard" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]">
              <LogoMark className="h-6 w-auto" />
            </Link>
          ) : (
            <Link href="/dashboard" className="min-w-0">
              <Logo className="h-7 w-auto text-ink" />
            </Link>
          )}
        </div>
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-ink-tertiary transition-colors hover:text-ink-secondary ${collapsed ? "" : "ml-auto"}`}
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
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
      className={`group relative flex items-center gap-2.5 rounded-xl px-2 py-2 transition-all ${
        active
          ? "text-ink"
          : "text-ink-secondary hover:text-ink"
      } ${collapsed ? "justify-center" : ""}`}
      style={active ? {
        background: "rgba(175, 70, 253, 0.12)",
        border: "1px solid rgba(175, 70, 253, 0.20)",
      } : {}}
    >
      <div className={`relative flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl transition-colors ${
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
          <div className="min-w-0">
            <div className={`truncate text-[13px] font-semibold leading-tight ${active ? "text-ink" : ""}`}>
              {children}
            </div>
            {description && (
              <div className={`mt-0.5 truncate text-[11px] leading-tight ${active ? "text-ink-secondary" : "text-ink-tertiary"}`}>
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
