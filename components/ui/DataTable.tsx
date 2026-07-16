"use client";

import { useMemo, useState } from "react";
import { InfoTooltip } from "./InfoTooltip";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  accessor: (row: T) => string | number;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "right";
  help?: string;
  /** Optional per-cell className based on row data, e.g. for color-coded thresholds */
  cellClass?: (row: T) => string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  loading?: boolean;
  emptyMessage?: string;
  filename?: string;
  defaultSortKey?: string;
  defaultSortDir?: "asc" | "desc";
  searchable?: boolean;
}

function toCsvValue(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

const PAGE_SIZE = 50;

function CopyableCell({ value, children }: { value: string; children: React.ReactNode }) {
  function handleCopy(e: React.ClipboardEvent) {
    e.preventDefault();
    e.clipboardData.setData("text/plain", value);
  }
  return (
    <div
      className="overflow-hidden text-ellipsis whitespace-nowrap"
      title={value}
      onCopy={handleCopy}
    >
      {children}
    </div>
  );
}

export function DataTable<T>({
  columns,
  rows,
  loading = false,
  emptyMessage = "No data for this period",
  filename = "report",
  defaultSortKey,
  defaultSortDir = "desc",
  searchable = true,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // [PM ENHANCEMENT] — momentary "Exported ✓" confirmation; silent success feels broken
  const [justExported, setJustExported] = useState(false);

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const column = columns.find((c) => c.key === sortKey);
    if (!column) return rows;
    return [...rows].sort((a, b) => {
      const av = column.accessor(a);
      const bv = column.accessor(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, columns, sortKey, sortDir]);

  const filteredRows = useMemo(() => {
    if (!query.trim()) return sortedRows;
    const q = query.toLowerCase();
    return sortedRows.filter((row) =>
      columns.some((col) => String(col.accessor(row)).toLowerCase().includes(q))
    );
  }, [sortedRows, query, columns]);

  const visibleRows = useMemo(() => filteredRows.slice(0, visibleCount), [filteredRows, visibleCount]);
  const hiddenCount = filteredRows.length - visibleRows.length;

  function handleQueryChange(q: string) {
    setQuery(q);
    setVisibleCount(PAGE_SIZE); // a new search starts back at the first page
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function exportCsv() {
    const header = columns.map((c) => toCsvValue(c.header)).join(",");
    const lines = filteredRows.map((row) => columns.map((c) => toCsvValue(c.accessor(row))).join(","));
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setJustExported(true);
    setTimeout(() => setJustExported(false), 2000);
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-2.5">
        <div className="flex items-center gap-3">
          {searchable && (
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search…"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="h-7 w-44 rounded-md border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 focus:border-brand-300 focus:bg-white focus:outline-none"
              />
            </div>
          )}
          <span className="text-xs text-slate-400">
            {visibleRows.length < filteredRows.length
              ? `Showing ${visibleRows.length} of ${filteredRows.length} rows`
              : `${filteredRows.length}${filteredRows.length !== rows.length ? ` of ${rows.length}` : ""} rows`}
          </span>
        </div>
        <button
          onClick={exportCsv}
          disabled={filteredRows.length === 0 || justExported}
          className={`flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-70 ${
            justExported
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40"
          }`}
        >
          {justExported ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Exported
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {columns.map((col, colIdx) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-600 ${
                    col.align === "right" ? "text-right" : "text-left"
                  } ${colIdx === 0 ? "sticky left-0 z-10 bg-white shadow-[4px_0_6px_-4px_rgba(15,23,42,0.15)]" : ""}`}
                  style={colIdx === 0
                    ? { backgroundColor: "#ffffff", willChange: "transform" }
                    : { width: "1%", whiteSpace: "nowrap" }
                  }
                >
                  <span className="inline-flex items-center gap-0.5">
                    {col.header}
                    {col.help && <InfoTooltip text={col.help} />}
                    {sortKey === col.key && (
                      <span className="ml-0.5 text-brand-500">{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={`border-b border-slate-50 ${i % 2 === 1 ? "bg-slate-50/40" : "bg-white"}`}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-5 py-3.5">
                      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && filteredRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-slate-400">
                  {query ? `No rows match "${query}"` : emptyMessage}
                </td>
              </tr>
            )}
            {!loading &&
              visibleRows.map((row, i) => {
                // The row's own zebra tint (bg-slate-50/40) is only 40% opaque by design —
                // fine for a plain cell, but the sticky column needs a fully solid color of
                // its own or content sliding underneath it during horizontal scroll bleeds
                // through, producing ghosted/overlapping text. "background: inherit" doesn't
                // reliably resolve to an opaque color here either, so compute it explicitly.
                const stickyBg = i % 2 === 1 ? "#f8fafc" : "#ffffff";
                return (
                  <tr
                    key={i}
                    className={`border-b border-slate-50 last:border-0 transition-colors hover:bg-blue-50/30 ${
                      i % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                    }`}
                  >
                    {columns.map((col, colIdx) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 whitespace-nowrap ${
                          col.cellClass ? col.cellClass(row) : "text-slate-700"
                        } ${
                          col.align === "right" ? "text-right tabular-nums" : "text-left"
                        } ${colIdx === 0 ? "sticky left-0 z-10 font-medium text-slate-700 shadow-[4px_0_6px_-4px_rgba(15,23,42,0.15)]" : ""}`}
                        style={colIdx === 0 ? { backgroundColor: stickyBg, maxWidth: "320px", willChange: "transform" } : undefined}
                      >
                        {colIdx === 0 ? (
                          <CopyableCell value={String(col.accessor(row))}>
                            {col.render ? col.render(row) : col.accessor(row)}
                          </CopyableCell>
                        ) : (
                          col.render ? col.render(row) : col.accessor(row)
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {!loading && hiddenCount > 0 && (
        <div className="flex items-center justify-center gap-3 border-t border-slate-100 px-5 py-3">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
          >
            Load {Math.min(PAGE_SIZE, hiddenCount)} more
          </button>
          <button
            onClick={() => setVisibleCount(filteredRows.length)}
            className="text-xs font-medium text-slate-400 transition-colors hover:text-brand-600"
          >
            Show all {filteredRows.length}
          </button>
        </div>
      )}
    </div>
  );
}
