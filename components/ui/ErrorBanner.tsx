"use client";

// [PM ENHANCEMENT] — Replaces raw error strings with a human explanation of what
// went wrong and what to do next, plus a one-click retry. Raw API text stays
// visible as secondary detail so nothing is hidden from power users.

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

function interpret(message: string): { title: string; hint: string; isAuth: boolean; showRaw: boolean } {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many calls") || m.includes("request limit")) {
    return {
      title: "Meta's API needs a short breather",
      hint: "You've hit a temporary rate limit. Wait a minute, then try again — your data is safe.",
      isAuth: false,
      showRaw: false,
    };
  }
  if (m.includes("session") || m.includes("token") || m.includes("expired") || m.includes("oauth") || m.includes("not authenticated")) {
    return {
      title: "Your session has expired",
      hint: "Log in again to reconnect your ad account — it takes a few seconds.",
      isAuth: true,
      showRaw: false,
    };
  }
  return {
    title: "We couldn't load this report",
    hint: "This is usually temporary. Try again — if it keeps happening, the detail below can help pinpoint it.",
    isAuth: false,
    showRaw: true,
  };
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  const { title, hint, isAuth, showRaw } = interpret(message);

  return (
    <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-5 py-4">
      <div className="flex items-start gap-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-red-800">{title}</div>
          <div className="mt-0.5 text-xs leading-relaxed text-red-700/80">{hint}</div>
          {showRaw && <div className="mt-1.5 truncate font-mono text-[11px] text-red-400" title={message}>{message}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isAuth ? (
            <a
              href="/api/auth/login"
              className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
            >
              Log in again
            </a>
          ) : (
            onRetry && (
              <button
                onClick={onRetry}
                className="rounded-lg border border-red-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-600 hover:text-white"
              >
                Try again
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
