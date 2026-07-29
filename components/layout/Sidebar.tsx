"use client";

import { useCallback, useState } from "react";
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
} from "./icons";

interface MenuItem {
  label: string;
  collapsedLabel?: string;
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
  { label: "My Collection", collapsedLabel: "My", icon: FolderIcon, href: "#" },
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
    collapsedLabel: "Generated",
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

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const w = collapsed ? "w-[100px]" : "w-[220px]";
  const [forceOpenLabel, setForceOpenLabel] = useState<string | null>(null);

  const handleCollapsedParentClick = useCallback(
    (label: string) => {
      setForceOpenLabel(label);
      onToggle();
    },
    [onToggle]
  );

  const clearForceOpen = useCallback(() => {
    setForceOpenLabel(null);
  }, []);

  return (
    <aside
      className={`sticky top-[60px] hidden h-[calc(100vh-60px)] shrink-0 self-start flex-col overflow-hidden transition-all duration-200 md:flex ${w}`}
      style={{ background: "var(--sidebar-bg)" }}
    >
      <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-3 gap-0.5">
        {MENU.map((item) =>
          collapsed ? (
            <CollapsedItem
              key={item.label}
              item={item}
              pathname={pathname}
              onExpandWithSubmenu={handleCollapsedParentClick}
            />
          ) : (
            <ExpandedItem
              key={item.label}
              item={item}
              pathname={pathname}
              forceOpen={forceOpenLabel === item.label}
              onForceOpenConsumed={clearForceOpen}
            />
          )
        )}
      </nav>
    </aside>
  );
}

function CollapsedItem({
  item,
  pathname,
  onExpandWithSubmenu,
}: {
  item: MenuItem;
  pathname: string;
  onExpandWithSubmenu: (label: string) => void;
}) {
  const active = isItemActive(item, pathname);
  const hasChildren = !!item.children?.length;
  const displayLabel = item.collapsedLabel ?? item.label;

  if (hasChildren) {
    return (
      <button
        onClick={() => onExpandWithSubmenu(item.label)}
        className="group relative flex flex-col items-center gap-1.5 rounded-md px-1 py-2.5 transition-colors"
      >
        <div
          className={`flex h-[40px] w-[40px] items-center justify-center rounded-lg transition-colors ${
            active ? "" : "text-ink-tertiary group-hover:text-ink-secondary"
          }`}
          style={active ? { background: "rgba(255, 255, 255, 0.067)", color: "#fff" } : {}}
        >
          <item.icon className="h-[20px] w-[20px]" />
        </div>
        <span className={`text-[11px] text-center leading-tight ${active ? "text-ink" : "text-ink-tertiary"}`}>
          {displayLabel}
        </span>
      </button>
    );
  }

  return (
    <Link
      href={item.href ?? "#"}
      className="group relative flex flex-col items-center gap-1.5 rounded-md px-1 py-2.5 transition-colors"
    >
      <div
        className={`flex h-[40px] w-[40px] items-center justify-center rounded-lg transition-colors ${
          active ? "" : "text-ink-tertiary group-hover:text-ink-secondary"
        }`}
        style={active ? { background: "rgba(255, 255, 255, 0.067)", color: "#fff" } : {}}
      >
        <item.icon className="h-[20px] w-[20px]" />
      </div>
      <span className={`text-[11px] text-center leading-tight ${active ? "text-ink" : "text-ink-tertiary"}`}>
        {displayLabel}
      </span>
    </Link>
  );
}

function ExpandedItem({
  item,
  pathname,
  forceOpen,
  onForceOpenConsumed,
}: {
  item: MenuItem;
  pathname: string;
  forceOpen: boolean;
  onForceOpenConsumed: () => void;
}) {
  const active = isItemActive(item, pathname);
  const hasChildren = !!item.children?.length;
  const [open, setOpen] = useState(active && hasChildren);

  if (forceOpen && !open) {
    setOpen(true);
    onForceOpenConsumed();
  }

  if (!hasChildren) {
    return (
      <Link
        href={item.href ?? "#"}
        className={`group flex items-center gap-3 rounded-md transition-colors ${
          active ? "text-ink" : "text-ink-secondary hover:text-ink"
        }`}
        style={{
          padding: "14px",
          ...(active ? { background: "rgba(255,255,255,0.067)" } : {}),
        }}
      >
        <item.icon className={`h-[20px] w-[20px] shrink-0 ${active ? "text-ink" : "text-ink-tertiary group-hover:text-ink-secondary"}`} />
        <span className="truncate text-[14px]">
          {item.label}
        </span>
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-3 rounded-md text-left transition-colors ${
          active ? "text-ink" : "text-ink-secondary hover:text-ink"
        }`}
        style={{
          padding: "14px",
          ...(active && !open ? { background: "rgba(255,255,255,0.067)" } : {}),
        }}
      >
        <item.icon className={`h-[20px] w-[20px] shrink-0 ${active ? "text-ink" : "text-ink-tertiary"}`} />
        <span className="flex-1 truncate text-[14px]">{item.label}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-ink-tertiary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="relative ml-[27px] mt-0.5 flex flex-col">
          {item.children!.map((child, i) => {
            const childActive = pathname === child.href;
            const isLast = i === item.children!.length - 1;
            return (
              <div key={child.label} className="relative flex items-center" style={{ minHeight: "34px" }}>
                {!isLast && (
                  <div
                    className="absolute left-0"
                    style={{ width: "1px", top: 0, bottom: 0, background: "rgba(255,255,255,0.12)" }}
                  />
                )}
                {isLast && (
                  <div
                    className="absolute left-0 top-0"
                    style={{ width: "1px", height: "50%", background: "rgba(255,255,255,0.12)" }}
                  />
                )}
                <div
                  className="absolute"
                  style={{
                    left: "-0.5px",
                    top: "calc(50% - 10px)",
                    width: "14px",
                    height: "10px",
                    borderLeft: "1px solid rgba(255,255,255,0.12)",
                    borderBottom: "1px solid rgba(255,255,255,0.12)",
                    borderBottomLeftRadius: "10px",
                    borderRight: "none",
                    borderTop: "none",
                  }}
                />
                <Link
                  href={child.href}
                  className={`ml-[18px] flex flex-1 items-center rounded-md transition-colors ${
                    childActive ? "text-ink" : "text-ink-secondary hover:text-ink"
                  }`}
                  style={{
                    padding: "7px 10px",
                    fontSize: "12px",
                    ...(childActive ? { background: "rgba(255,255,255,0.16)" } : {}),
                  }}
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
