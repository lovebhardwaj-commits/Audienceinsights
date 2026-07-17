import type { DateRange } from "./types";

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(s: string, days: number): string {
  const d = parseISODate(s);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

export function addMonths(s: string, months: number): string {
  const d = parseISODate(s);
  d.setUTCMonth(d.getUTCMonth() + months);
  return toISODate(d);
}

export function startOfMonth(s: string): string {
  const d = parseISODate(s);
  return toISODate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}

export function endOfMonth(s: string): string {
  const d = parseISODate(s);
  return toISODate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

export function monthLabel(s: string): string {
  const d = parseISODate(s);
  return d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export interface MonthWindow {
  label: string;
  monthStart: string;
  monthEnd: string;
}

/** Splits [since, until] into calendar-month chunks, clipped to the requested range. */
export function monthWindows(since: string, until: string): MonthWindow[] {
  const windows: MonthWindow[] = [];
  const untilDate = parseISODate(until);
  let cursor = since;
  while (parseISODate(cursor) <= untilDate) {
    const calendarEnd = endOfMonth(cursor);
    const monthEnd = parseISODate(calendarEnd) > untilDate ? until : calendarEnd;
    windows.push({ label: monthLabel(cursor), monthStart: cursor, monthEnd });
    cursor = startOfMonth(addMonths(cursor, 1));
  }
  return windows;
}

/** ISO-ish week start (Monday) for a given date string, used for cohort grouping. */
export function weekStart(s: string): string {
  const d = parseISODate(s);
  const day = d.getUTCDay() || 7; // Mon=1..Sun=7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return toISODate(d);
}

export interface WeekWindow {
  label: string;
  since: string;
  until: string;
}

/** Expanding weekly windows from `since`, each 7 days longer, clipped to `until`. */
export function expandingWeeklyWindows(since: string, until: string): WeekWindow[] {
  const windows: WeekWindow[] = [];
  const untilDate = parseISODate(until);
  let weekEnd = addDays(since, 6);
  let weekNum = 1;
  while (parseISODate(weekEnd) < untilDate) {
    windows.push({ label: `Week ${weekNum}`, since, until: weekEnd });
    weekNum++;
    weekEnd = addDays(weekEnd, 7);
  }
  windows.push({ label: `Week ${weekNum}`, since, until });
  return windows;
}

/** Inclusive day count between two ISO dates. */
export function daysInclusive(since: string, until: string): number {
  return Math.round((parseISODate(until).getTime() - parseISODate(since).getTime()) / 86_400_000) + 1;
}

/** A weekly bucket is partial when it spans fewer than 7 days — the trailing bucket
 *  of a time_increment=7 series when the range end lands mid-week (D6). */
export function isPartialWeek(since: string, until: string): boolean {
  return daysInclusive(since, until) < 7;
}

/** True when `until` falls inside the calendar month it names (month still in flight). */
export function isPartialMonth(monthStart: string, monthEnd: string): boolean {
  return monthEnd !== endOfMonth(monthStart);
}

export function lastNDays(n: number): DateRange {
  const until = toISODate(new Date());
  const since = addDays(until, -n);
  return { since, until };
}

/** Previous N *complete* calendar months — "Previous 1 Month" in July = Jun 1–Jun 30,
 *  "Previous 3 Months" = Apr 1–Jun 30. The running month is never included. */
export function lastNMonths(n: number): DateRange {
  const today = toISODate(new Date());
  const until = endOfMonth(addMonths(startOfMonth(today), -1));
  const since = startOfMonth(addMonths(startOfMonth(today), -n));
  return { since, until };
}
