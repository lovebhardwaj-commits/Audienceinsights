"use client";

// "Live from Meta · fetched 11:42 AM" (Part 8) — turns the no-database architecture
// into a visible trust signal. Hidden until the first successful fetch.

export function FreshnessStamp({ fetchedAt }: { fetchedAt: number | null }) {
  if (!fetchedAt) return null;
  const time = new Date(fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-tertiary">
      Live from Meta · fetched {time}
    </span>
  );
}
