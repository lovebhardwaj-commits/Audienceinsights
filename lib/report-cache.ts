// Client-side report cache — two-layer:
//   L1: in-memory Map (fast, survives SPA navigation)
//   L2: localStorage (survives page refreshes)
//
// Cache key = full request URL, which encodes accountId + report type + date range +
// all extra params. A different date range = a different key = a cache miss = a fresh
// fetch. No TTL — data is kept until the user picks a different range or storage is full.

interface CacheEntry {
  data: unknown;
  fetchedAt: number;
}

const LS_PREFIX     = "arc:"; // "ads reach cache"
const LS_MAX_ENTRIES = 50;
// Bump this whenever a report's response shape changes to auto-invalidate stale entries.
const CACHE_VERSION = 7;

const store = new Map<string, CacheEntry>();

export interface CacheHit<T> {
  data: T;
  stale: false;
  fetchedAt: number;
}

// ── localStorage helpers (graceful fallback if unavailable) ──────────────────

function lsRead(key: string): CacheEntry | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? (JSON.parse(raw) as CacheEntry) : null;
  } catch {
    return null;
  }
}

function lsWrite(key: string, entry: CacheEntry): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry));
  } catch {
    evictOldest();
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry)); } catch { /* give up */ }
  }
}

function arcKeys(): string[] {
  if (typeof localStorage === "undefined") return [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(LS_PREFIX)) keys.push(k);
  }
  return keys;
}

function evictOldest(): void {
  const entries: { k: string; fetchedAt: number }[] = arcKeys().map((k) => {
    try {
      const e = JSON.parse(localStorage.getItem(k) ?? "{}") as CacheEntry;
      return { k, fetchedAt: e.fetchedAt ?? 0 };
    } catch { return { k, fetchedAt: 0 }; }
  });
  entries.sort((a, b) => a.fetchedAt - b.fetchedAt);
  const toRemove = Math.max(1, Math.floor(entries.length / 2));
  entries.slice(0, toRemove).forEach(({ k }) => localStorage.removeItem(k));
}

function pruneLocalStorage(): void {
  const keys = arcKeys();
  if (keys.length <= LS_MAX_ENTRIES) return;
  const entries = keys.map((k) => {
    try {
      const e = JSON.parse(localStorage.getItem(k) ?? "{}") as CacheEntry;
      return { k, fetchedAt: e.fetchedAt ?? 0 };
    } catch { return { k, fetchedAt: 0 }; }
  });
  entries.sort((a, b) => a.fetchedAt - b.fetchedAt);
  entries.slice(0, entries.length - LS_MAX_ENTRIES).forEach(({ k }) => localStorage.removeItem(k));
}

// ── Public API ────────────────────────────────────────────────────────────────

function vKey(key: string): string {
  return `v${CACHE_VERSION}:${key}`;
}

export function getCached<T>(key: string): CacheHit<T> | null {
  const k = vKey(key);
  const mem = store.get(k);
  if (mem) return { data: mem.data as T, stale: false, fetchedAt: mem.fetchedAt };

  const ls = lsRead(k);
  if (!ls) return null;
  store.set(k, ls); // promote to L1
  return { data: ls.data as T, stale: false, fetchedAt: ls.fetchedAt };
}

export function setCached(key: string, data: unknown): number {
  const k = vKey(key);
  const fetchedAt = Date.now();
  const entry: CacheEntry = { data, fetchedAt };
  store.set(k, entry);
  lsWrite(k, entry);
  pruneLocalStorage();
  return fetchedAt;
}

export function clearCache() {
  store.clear();
  arcKeys().forEach((k) => localStorage.removeItem(k));
}

/** Remove a single entry from both L1 and L2 so the next run() hits the network. */
export function evictCached(key: string): void {
  const k = vKey(key);
  store.delete(k);
  if (typeof localStorage !== "undefined") {
    try { localStorage.removeItem(LS_PREFIX + k); } catch { /* ignore */ }
  }
}
