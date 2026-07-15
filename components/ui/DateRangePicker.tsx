"use client";

import { useEffect, useRef, useState } from "react";
import type { DateRange } from "@/lib/types";
import { lastNMonths } from "@/lib/dates";

interface DateRangePickerProps {
  value: DateRange | null;
  onChange: (range: DateRange) => void;
}

// Previous 1–13 complete months (13 = max lookback for Meta reach data)
const MONTH_OPTIONS = Array.from({ length: 13 }, (_, i) => i + 1);

function formatFullRange(range: DateRange): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" };
  const since = new Date(range.since + "T00:00:00Z").toLocaleDateString("en-IN", opts);
  const until = new Date(range.until + "T00:00:00Z").toLocaleDateString("en-IN", opts);
  return `${since} – ${until}`;
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [draftSince, setDraftSince] = useState("");
  const [draftUntil, setDraftUntil] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const activeMonths = value
    ? MONTH_OPTIONS.find((n) => {
        const r = lastNMonths(n);
        return r.since === value.since && r.until === value.until;
      }) ?? null
    : null;

  function handleMonthSelect(n: number) {
    setCustomOpen(false);
    setMenuOpen(false);
    onChange(lastNMonths(n));
  }

  function openCustom() {
    setMenuOpen(false);
    setCustomOpen(true);
    const today = new Date().toISOString().slice(0, 10);
    setDraftUntil(value?.until ?? today);
    setDraftSince(value?.since ?? today);
  }

  function applyCustom() {
    if (!draftSince || !draftUntil) return;
    onChange({ since: draftSince, until: draftUntil });
    setCustomOpen(false);
  }

  return (
    <div ref={rootRef} className="relative flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        {/* Trigger — always shows the resolved dates when a range is active */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className={`flex h-9 items-center gap-2 rounded-lg border px-3.5 text-[13px] font-semibold shadow-sm transition-colors ${
            menuOpen
              ? "border-brand-400 bg-white text-slate-800 ring-2 ring-brand-100"
              : value
              ? "border-slate-200 bg-white text-slate-700 hover:border-brand-300"
              : "border-brand-300 bg-brand-600 text-white hover:bg-brand-700"
          }`}
        >
          <CalendarIcon className={value || menuOpen ? "text-brand-600" : "text-white/80"} />
          {value ? (
            <span className="flex items-baseline gap-1.5">
              {activeMonths !== null && (
                <span className="text-slate-500">Previous {activeMonths} Month{activeMonths > 1 ? "s" : ""} ·</span>
              )}
              <span className="tabular-nums">{formatFullRange(value)}</span>
            </span>
          ) : (
            "Select period…"
          )}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${menuOpen ? "rotate-180" : ""} ${value || menuOpen ? "text-slate-400" : "text-white/70"}`}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="absolute right-0 top-full z-50 mt-1.5 max-h-[400px] w-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg">
          {MONTH_OPTIONS.map((n) => {
            const r = lastNMonths(n);
            const selected = activeMonths === n;
            return (
              <button
                key={n}
                onClick={() => handleMonthSelect(n)}
                className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] transition-colors hover:bg-slate-50 ${
                  selected ? "font-semibold text-brand-600" : "text-slate-700"
                }`}
              >
                <span>Previous {n} Month{n > 1 ? "s" : ""}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[11px] tabular-nums text-slate-400">{formatFullRange(r)}</span>
                  {selected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={openCustom}
            className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
          >
            <CalendarIcon className="text-slate-400" />
            Custom range…
          </button>
        </div>
      )}

      {/* Custom date inputs */}
      {customOpen && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
          <input
            type="date"
            value={draftSince}
            max={draftUntil || undefined}
            onChange={(e) => setDraftSince(e.target.value)}
            className="rounded border border-slate-100 px-1.5 py-0.5 text-xs text-slate-600 outline-none focus:border-brand-300"
          />
          <span className="text-xs text-slate-300">→</span>
          <input
            type="date"
            value={draftUntil}
            min={draftSince || undefined}
            onChange={(e) => setDraftUntil(e.target.value)}
            className="rounded border border-slate-100 px-1.5 py-0.5 text-xs text-slate-600 outline-none focus:border-brand-300"
          />
          <button
            onClick={applyCustom}
            disabled={!draftSince || !draftUntil}
            className="rounded-md bg-brand-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
          >
            Apply
          </button>
          <button
            onClick={() => setCustomOpen(false)}
            className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
