"use client";

import { useEffect, useState } from "react";
import type { MetaErrorCode } from "@/lib/meta-api";

// [PM ENHANCEMENT] — the banner now branches on a STRUCTURED error code, never on
// substring matching. A 504/timeout can no longer masquerade as "session expired" (D1).
// Raw API text stays visible as secondary detail so nothing is hidden from power users.

interface ErrorBannerProps {
  message: string;
  /** Structured taxonomy from the API. Missing/legacy → treated as UNKNOWN. */
  code?: MetaErrorCode | null;
  onRetry?: () => void;
  /** For TIMEOUT: re-run the report clamped to a 1-month range. */
  onRetryShorter?: () => void;
}

type Interpretation = {
  title: string;
  hint: string;
  tone: "auth" | "rate" | "timeout" | "generic";
  showRaw: boolean;
};

function interpret(code: MetaErrorCode | null | undefined, message: string): Interpretation {
  // Legacy fallback: if no code arrived, only treat an *explicit* OAuth phrase as auth —
  // never a bare "timeout"/"failed" string. This is the D1 root-cause guard.
  const effective: MetaErrorCode =
    code ?? (/\boauth\b|not authenticated|access token has expired/i.test(message) ? "META_AUTH" : "UNKNOWN");

  switch (effective) {
    case "META_AUTH":
      return {
        title: "Your session has expired",
        hint: "Log in again to reconnect your ad account — it takes a few seconds.",
        tone: "auth",
        showRaw: false,
      };
    case "META_RATE_LIMIT":
      return {
        title: "Meta's API needs a short breather",
        hint: "You've hit a temporary rate limit. This retries automatically — your data is safe.",
        tone: "rate",
        showRaw: false,
      };
    case "TIMEOUT":
      return {
        title: "This range is too heavy to compute in one go",
        hint: "Try a shorter range or fewer entities. Your session is fine — this was a timeout, not a login problem.",
        tone: "timeout",
        showRaw: false,
      };
    default:
      return {
        title: "We couldn't load this report",
        hint: "This is usually temporary. Try again — if it keeps happening, the detail below can help pinpoint it.",
        tone: "generic",
        showRaw: true,
      };
  }
}

const RATE_LIMIT_COUNTDOWN_S = 30;

export function ErrorBanner({ message, code, onRetry, onRetryShorter }: ErrorBannerProps) {
  const { title, hint, tone, showRaw } = interpret(code, message);

  // META_RATE_LIMIT auto-retries on a visible countdown (spec 4.3).
  const [countdown, setCountdown] = useState(tone === "rate" ? RATE_LIMIT_COUNTDOWN_S : 0);
  useEffect(() => {
    if (tone !== "rate" || !onRetry) return;
    setCountdown(RATE_LIMIT_COUNTDOWN_S);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          onRetry();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tone, message]);

  const loginHref =
    typeof window !== "undefined"
      ? `/api/auth/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`
      : "/api/auth/login";

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
          <div className="mt-0.5 text-xs leading-relaxed text-red-700/80">
            {hint}
            {tone === "rate" && countdown > 0 && <> Retrying in {countdown}s…</>}
          </div>
          {showRaw && <div className="mt-1.5 truncate font-mono text-[11px] text-red-400" title={message}>{message}</div>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {tone === "auth" ? (
            <a
              href={loginHref}
              className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
            >
              Log in again
            </a>
          ) : (
            <>
              {tone === "timeout" && onRetryShorter && (
                <button
                  onClick={onRetryShorter}
                  className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Retry with 1 month
                </button>
              )}
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="rounded-lg border border-red-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-600 hover:text-white"
                >
                  Try again
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
