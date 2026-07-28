"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  DashboardIcon,
  PenToolIcon,
  FolderIcon,
  BellIcon,
  AuditIcon,
  MetaInsightsIcon,
  GeneratedReportsIcon,
  TrendingUpIcon,
  VennIcon,
  ClockIcon,
  UsersIcon,
  HandshakeIcon,
  GridIcon,
  RefreshIcon,
} from "./icons";

interface MenuItem {
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
  href?: string;
  children?: { label: string; href: string }[];
}

const MENU: MenuItem[] = [
  { label: "Home", icon: HomeIcon, href: "/dashboard" },
  {
    label: "Dashboard",
    icon: DashboardIcon,
    children: [
      { label: "Creative Performance", href: "#" },
      { label: "Brand Analysis", href: "#" },
    ],
  },
  { label: "Ads", icon: PenToolIcon, href: "#" },
  { label: "My Collection", icon: FolderIcon, href: "#" },
  { label: "Alerts", icon: BellIcon, href: "#" },
  { label: "Audit", icon: AuditIcon, href: "#" },
  {
    label: "Meta Insights",
    icon: MetaInsightsIcon,
    children: [
      { label: "New Reach", href: "/reports/net-new-reach" },
      { label: "Overlap", href: "/reports/campaign-overlap" },
      { label: "Conversion Windows", href: "/reports/conversion-windows" },
      { label: "User Segments", href: "/reports/audience-segments" },
      { label: "Partnership Ads", href: "/reports/partnership-ads" },
      { label: "Frequency", href: "/reports/frequency" },
      { label: "Creative Churn", href: "/reports/creative-churn" },
    ],
  },
  {
    label: "Generated Reports",
    icon: GeneratedReportsIcon,
    children: [
      { label: "Creative Performance", href: "#" },
      { label: "Audit Reports", href: "#" },
      { label: "Reach Analysis", href: "#" },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();
  const w = collapsed ? "w-[84px]" : "w-[230px]";

  return (
    <aside
      className={`sticky top-[60px] hidden h-[calc(100vh-60px)] shrink-0 self-start flex-col overflow-hidden transition-all duration-200 md:flex ${w}`}
      style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
        {MENU.map((item) =>
          collapsed ? (
            <CollapsedItem key={item.label} item={item} pathname={pathname} />
          ) : (
            <ExpandedItem key={item.label} item={item} pathname={pathname} />
          )
        )}
      </nav>
    </aside>
  );
}

function CollapsedItem({ item, pathname }: { item: MenuItem; pathname: string }) {
  const active = isItemActive(item, pathname);
  const href = item.href ?? item.children?.[0]?.href ?? "#";

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
        <item.icon className="h-[18px] w-[18px]" />
      </div>
      <span className={`text-[10px] font-medium text-center leading-tight ${active ? "text-ink" : "text-ink-tertiary"}`}>
        {item.label}
      </span>
    </Link>
  );
}

function ExpandedItem({ item, pathname }: { item: MenuItem; pathname: string }) {
  const active = isItemActive(item, pathname);
  const hasChildren = !!item.children?.length;
  const [open, setOpen] = useState(active && hasChildren);

  if (!hasChildren) {
    return (
      <Link
        href={item.href ?? "#"}
        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
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
          <item.icon className="h-[17px] w-[17px]" />
        </div>
        <span className={`truncate text-[13px] font-semibold ${active ? "text-ink" : ""}`}>
          {item.label}
        </span>
      </Link>
    );
  }

  return (
    <div className="mt-0.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
          active ? "text-ink" : "text-ink-secondary hover:text-ink"
        }`}
        style={active && !open ? { background: "rgba(175, 70, 253, 0.08)" } : {}}
      >
        <div
          className={`flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-xl transition-colors ${
            active ? "text-brand-500" : "text-ink-tertiary"
          }`}
          style={active ? { background: "rgba(175, 70, 253, 0.15)" } : {}}
        >
          <item.icon className="h-[17px] w-[17px]" />
        </div>
        <span className="flex-1 truncate text-[13px] font-semibold">{item.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-ink-tertiary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="relative ml-[26px] mt-0.5 flex flex-col">
          {item.children!.map((child, i) => {
            const childActive = pathname === child.href;
            const isLast = i === item.children!.length - 1;
            return (
              <div key={child.label} className="relative flex items-center" style={{ minHeight: "32px" }}>
                {/* Vertical line */}
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
                  href={child.href}
                  className={`ml-[16px] flex flex-1 items-center gap-2 rounded-lg py-[7px] pl-2 pr-3 text-[12.5px] font-medium transition-colors ${
                    childActive ? "font-semibold text-ink" : "text-ink-secondary hover:text-ink"
                  }`}
                  style={childActive ? { background: "rgba(175, 70, 253, 0.10)" } : {}}
                >
                  <span className="truncate">{child.label}</span>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function isItemActive(item: MenuItem, pathname: string): boolean {
  if (item.href && pathname === item.href) return true;
  if (item.children) return item.children.some((c) => pathname === c.href);
  return false;
}
