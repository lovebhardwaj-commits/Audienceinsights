"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DateRange } from "@/lib/types";
import { addDays, addMonths, endOfMonth, lastNMonths, parseISODate, startOfMonth } from "@/lib/dates";

interface DateRangePickerProps {
  value: DateRange | null;
  onChange: (range: DateRange) => void;
}

// Previous 1–24 complete months. Meta's Insights API supports reach lookback well
// beyond a year (confirmed directly against the Graph API) — this was previously
// capped at 13 on an incorrect assumption. 24 months (2 years) is the real ceiling.
const MONTH_OPTIONS = Array.from({ length: 24 }, (_, i) => i + 1);
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatFullRange(range: DateRange): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" };
  const since = new Date(range.since + "T00:00:00Z").toLocaleDateString("en-IN", opts);
  const until = new Date(range.until + "T00:00:00Z").toLocaleDateString("en-IN", opts);
  return `${since} – ${until}`;
}

function formatMonthTitle(monthStart: string): string {
  return new Date(monthStart + "T00:00:00Z").toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
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

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

interface DayCell {
  date: string;
  day: number;
  inMonth: boolean;
  disabled: boolean;
}

function buildCalendarGrid(viewMonth: string, today: string): DayCell[] {
  const first = parseISODate(viewMonth);
  const firstWeekday = first.getUTCDay();
  const daysInMonth = Number(endOfMonth(viewMonth).slice(8, 10));

  const cells: DayCell[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    const date = addDays(viewMonth, i - firstWeekday);
    cells.push({ date, day: Number(date.slice(8, 10)), inMonth: false, disabled: true });
  }
  for (let d = 0; d < daysInMonth; d++) {
    const date = addDays(viewMonth, d);
    cells.push({ date, day: d + 1, inMonth: true, disabled: date > today });
  }
  while (cells.length < 42) {
    const lastDate = cells[cells.length - 1].date;
    const date = addDays(lastDate, 1);
    cells.push({ date, day: Number(date.slice(8, 10)), inMonth: false, disabled: true });
  }
  return cells;
}

interface MonthPaneProps {
  monthStart: string;
  today: string;
  rangeLo: string | null;
  rangeHi: string | null;
  onDayClick: (date: string) => void;
  onDayHover: (date: string) => void;
  onTitleClick: () => void;
}

function MonthPane({ monthStart, today, rangeLo, rangeHi, onDayClick, onDayHover, onTitleClick }: MonthPaneProps) {
  const cells = useMemo(() => buildCalendarGrid(monthStart, today), [monthStart, today]);

  return (
    <div className="w-64">
      <button
        onClick={onTitleClick}
        className="mb-2 w-full rounded-md py-1 text-center text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
      >
        {formatMonthTitle(monthStart)}
      </button>
      <div className="grid grid-cols-7 gap-y-0.5">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="flex h-7 items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {w}
          </div>
        ))}
        {cells.map((cell) => {
          const isStart = cell.date === rangeLo;
          const isEnd = cell.date === rangeHi;
          const inRange = !!(rangeLo && rangeHi && cell.date > rangeLo && cell.date < rangeHi);
          const showBand = isStart || isEnd || inRange;
          return (
            <div key={cell.date} className="relative h-8">
              {showBand && (
                <div
                  className={`absolute inset-y-0 bg-brand-50 ${
                    isStart && isEnd ? "hidden" : isStart ? "left-1/2 right-0" : isEnd ? "left-0 right-1/2" : "left-0 right-0"
                  }`}
                />
              )}
              <button
                type="button"
                disabled={cell.disabled}
                onClick={() => onDayClick(cell.date)}
                onMouseEnter={() => onDayHover(cell.date)}
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs tabular-nums transition-colors ${
                  cell.disabled
                    ? "cursor-not-allowed text-slate-200"
                    : !cell.inMonth
                    ? "text-slate-300 hover:bg-slate-100"
                    : isStart || isEnd
                    ? "bg-brand-600 font-semibold text-white"
                    : inRange
                    ? "text-brand-700 hover:bg-brand-100"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {cell.day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  // "days" shows the two-month calendar; "months" is the quick year/month jump grid.
  const [pickerLevel, setPickerLevel] = useState<"days" | "months">("days");
  const [draftSince, setDraftSince] = useState<string | null>(null);
  const [draftUntil, setDraftUntil] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState<string>("");
  const [gridYear, setGridYear] = useState<number>(0);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().slice(0, 10);
  const earliestMonth = startOfMonth(addMonths(today, -(MONTH_OPTIONS.length - 1)));
  const currentMonth = startOfMonth(today);
  const earliestYear = Number(earliestMonth.slice(0, 4));
  const currentYear = Number(currentMonth.slice(0, 4));

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setCustomOpen(false);
      }
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
    setCustomOpen(true);
    setPickerLevel("days");
    setDraftSince(value?.since ?? null);
    setDraftUntil(value?.until ?? null);
    // Left pane shows the month before the right pane's (until's) month, so both
    // ends of a typical short range are visible without navigating at all.
    const rightMonth = startOfMonth(value?.until ?? today);
    setViewMonth(startOfMonth(addMonths(rightMonth, -1)));
  }

  function backToList() {
    setCustomOpen(false);
  }

  function handleDayClick(date: string) {
    if (date > today) return;
    if (!draftSince || (draftSince && draftUntil)) {
      setDraftSince(date);
      setDraftUntil(null);
      return;
    }
    if (date < draftSince) {
      setDraftUntil(draftSince);
      setDraftSince(date);
    } else {
      setDraftUntil(date);
    }
  }

  function applyCustom() {
    if (!draftSince || !draftUntil) return;
    onChange({ since: draftSince, until: draftUntil });
    setMenuOpen(false);
    setCustomOpen(false);
  }

  function goPrevMonth() {
    setViewMonth((m) => (m <= earliestMonth ? m : startOfMonth(addMonths(m, -1))));
  }

  function goNextMonth() {
    setViewMonth((m) => {
      const next = startOfMonth(addMonths(m, 1));
      const nextRightPane = startOfMonth(addMonths(next, 1));
      return nextRightPane > currentMonth ? m : next;
    });
  }

  function openMonthGrid() {
    setGridYear(Number(viewMonth.slice(0, 4)));
    setPickerLevel("months");
  }

  function selectMonthFromGrid(monthIndex: number) {
    const candidate = `${gridYear}-${String(monthIndex + 1).padStart(2, "0")}-01`;
    if (candidate > currentMonth) return;
    setViewMonth(candidate);
    setPickerLevel("days");
  }

  function prevGridYear() {
    setGridYear((y) => Math.max(y - 1, earliestYear));
  }

  function nextGridYear() {
    setGridYear((y) => Math.min(y + 1, currentYear));
  }

  const rightMonth = viewMonth ? startOfMonth(addMonths(viewMonth, 1)) : "";
  const rangeStart = draftSince;
  const rangeEnd = draftUntil ?? (draftSince && hoverDate ? hoverDate : null);
  const rangeLo = rangeStart && rangeEnd ? (rangeStart < rangeEnd ? rangeStart : rangeEnd) : rangeStart;
  const rangeHi = rangeStart && rangeEnd ? (rangeStart < rangeEnd ? rangeEnd : rangeStart) : rangeStart;

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

      {menuOpen && (
        <div className="absolute right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {!customOpen ? (
            <div className="max-h-[420px] w-[19rem] overflow-y-auto py-1.5">
              <button
                onClick={openCustom}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <CalendarIcon className="text-brand-600" />
                Custom range…
              </button>
              <div className="my-1 border-t border-slate-100" />
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
            </div>
          ) : (
            <div className="w-[34rem] p-3">
              <div className="mb-2 flex items-center justify-between">
                <button
                  onClick={backToList}
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Presets
                </button>
                {pickerLevel === "days" && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={goPrevMonth}
                      disabled={viewMonth <= earliestMonth}
                      className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs font-medium text-slate-400">{viewMonth && `${formatMonthTitle(viewMonth)} – ${formatMonthTitle(rightMonth)}`}</span>
                    <button
                      onClick={goNextMonth}
                      disabled={rightMonth >= currentMonth}
                      className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {pickerLevel === "months" ? (
                <div className="px-2 pb-1">
                  <div className="mb-2 flex items-center justify-center gap-3">
                    <button
                      onClick={prevGridYear}
                      disabled={gridYear <= earliestYear}
                      className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="w-14 text-center text-sm font-semibold text-slate-700 tabular-nums">{gridYear}</span>
                    <button
                      onClick={nextGridYear}
                      disabled={gridYear >= currentYear}
                      className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 pb-2">
                    {MONTH_ABBR.map((label, i) => {
                      const candidate = `${gridYear}-${String(i + 1).padStart(2, "0")}-01`;
                      const disabled = candidate > currentMonth || candidate < earliestMonth;
                      const isCurrentView = candidate === viewMonth;
                      return (
                        <button
                          key={label}
                          disabled={disabled}
                          onClick={() => selectMonthFromGrid(i)}
                          className={`rounded-lg py-2.5 text-xs font-medium transition-colors ${
                            disabled
                              ? "cursor-not-allowed text-slate-200"
                              : isCurrentView
                              ? "bg-brand-600 text-white"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex gap-4" onMouseLeave={() => setHoverDate(null)}>
                  <MonthPane
                    monthStart={viewMonth}
                    today={today}
                    rangeLo={rangeLo}
                    rangeHi={rangeHi}
                    onDayClick={handleDayClick}
                    onDayHover={setHoverDate}
                    onTitleClick={openMonthGrid}
                  />
                  <div className="w-px bg-slate-100" />
                  <MonthPane
                    monthStart={rightMonth}
                    today={today}
                    rangeLo={rangeLo}
                    rangeHi={rangeHi}
                    onDayClick={handleDayClick}
                    onDayHover={setHoverDate}
                    onTitleClick={openMonthGrid}
                  />
                </div>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">
                  {draftSince && draftUntil
                    ? formatFullRange({ since: draftSince, until: draftUntil })
                    : draftSince
                    ? "Pick an end date…"
                    : "Pick a start date…"}
                </span>
                <button
                  onClick={applyCustom}
                  disabled={!draftSince || !draftUntil}
                  className="rounded-md bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
