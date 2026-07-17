"use client";

import { useCallback, useState } from "react";
import type { MetaErrorCode } from "@/lib/meta-api";
import { CLIENT_ABORT_MS, classifyClientError } from "@/lib/hooks/report-errors";
import { getCached, setCached } from "@/lib/report-cache";

interface JsonReportState<T> {
  loading: boolean;
  data: T | null;
  error: string | null;
  errorCode: MetaErrorCode | null;
  /** Wall-clock ms of the currently-shown data — powers the "fetched 11:42 AM" stamp. */
  fetchedAt: number | null;
}

export function useJsonReport<T>() {
  const [state, setState] = useState<JsonReportState<T>>({ loading: false, data: null, error: null, errorCode: null, fetchedAt: null });

  const run = useCallback(async (url: string) => {
    // D-cache: a fresh hit renders instantly and skips the network entirely; a stale hit
    // renders instantly and revalidates in the background (Part 8).
    const cached = getCached<T>(url);
    if (cached) {
      setState({ loading: cached.stale, data: cached.data, error: null, errorCode: null, fetchedAt: cached.fetchedAt });
      if (!cached.stale) return;
    } else {
      // Hold the previous render during a refetch instead of flashing back to a skeleton.
      setState((prev) => ({ loading: true, data: prev.data, error: null, errorCode: null, fetchedAt: prev.fetchedAt }));
    }
    // Fail gracefully before Vercel's 120s kill so the UI shows a TIMEOUT banner (spec 4.3).
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_ABORT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(body.error || `Request failed (${res.status})`);
        (err as { code?: MetaErrorCode }).code = body.code;
        throw err;
      }
      const fetchedAt = setCached(url, body);
      setState({ loading: false, data: body as T, error: null, errorCode: null, fetchedAt });
    } catch (err) {
      const { message, code } = classifyClientError(err);
      setState((prev) => ({ loading: false, data: prev.data, error: message, errorCode: code, fetchedAt: prev.fetchedAt }));
    } finally {
      clearTimeout(timer);
    }
  }, []);

  return { ...state, isInitialLoad: state.loading && state.data === null, run };
}
