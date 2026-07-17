"use client";

import { useCallback, useRef, useState } from "react";
import type { NdjsonEvent } from "@/lib/stream";
import type { MetaErrorCode } from "@/lib/meta-api";
import { CLIENT_ABORT_MS, classifyClientError } from "@/lib/hooks/report-errors";
import { getCached, setCached } from "@/lib/report-cache";

interface ProgressState {
  current: number;
  total: number;
  label: string;
}

interface StreamingReportState<T> {
  loading: boolean;
  progress: ProgressState | null;
  data: T | null;
  error: string | null;
  errorCode: MetaErrorCode | null;
  /** Entities streamed in so far via "partial" events — lets pages render bar-by-bar (D2). */
  partials: unknown[];
  fetchedAt: number | null;
}

export function useStreamingReport<T>() {
  const [state, setState] = useState<StreamingReportState<T>>({
    loading: false,
    progress: null,
    data: null,
    error: null,
    errorCode: null,
    partials: [],
    fetchedAt: null,
  });
  const abortRef = useRef<AbortController | null>(null);
  // Whether the user (not the timeout) triggered the abort — a manual cancel isn't an error.
  const userCancelledRef = useRef(false);

  const run = useCallback(async (url: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    userCancelledRef.current = false;
    // D-cache: a fresh hit renders instantly and skips the stream; a stale hit renders
    // instantly and revalidates in the background (Part 8).
    const cached = getCached<T>(url);
    if (cached && !cached.stale) {
      setState({ loading: false, progress: null, data: cached.data, error: null, errorCode: null, partials: [], fetchedAt: cached.fetchedAt });
      return;
    }

    // Fail gracefully before Vercel's 120s kill with a TIMEOUT banner (spec 4.3, D1).
    const timer = setTimeout(() => controller.abort(), CLIENT_ABORT_MS);

    // Hold the previous render (or a stale cache hit) during the refetch instead of a skeleton.
    setState((prev) => ({ loading: true, progress: null, data: cached?.data ?? prev.data, error: null, errorCode: null, partials: [], fetchedAt: cached?.fetchedAt ?? prev.fetchedAt }));

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        const err = new Error(body.error || `Request failed (${res.status})`);
        (err as { code?: MetaErrorCode }).code = body.code;
        throw err;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event: NdjsonEvent = JSON.parse(line);
          if (event.type === "progress") {
            setState((prev) => ({ ...prev, progress: event }));
          } else if (event.type === "partial") {
            setState((prev) => ({ ...prev, partials: [...prev.partials, event.item] }));
          } else if (event.type === "done") {
            const fetchedAt = setCached(url, event.data);
            setState((prev) => ({ loading: false, progress: null, data: event.data as T, error: null, errorCode: null, partials: prev.partials, fetchedAt }));
          } else if (event.type === "error") {
            setState((prev) => ({ loading: false, progress: null, data: prev.data, error: event.message, errorCode: event.code, partials: prev.partials, fetchedAt: prev.fetchedAt }));
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted && userCancelledRef.current) return;
      const { message, code } = classifyClientError(err);
      setState((prev) => ({ loading: false, progress: null, data: prev.data, error: message, errorCode: code, partials: prev.partials, fetchedAt: prev.fetchedAt }));
    } finally {
      clearTimeout(timer);
    }
  }, []);

  const cancel = useCallback(() => {
    userCancelledRef.current = true;
    abortRef.current?.abort();
    setState((prev) => ({ loading: false, progress: null, data: prev.data, error: "Cancelled", errorCode: null, partials: prev.partials, fetchedAt: prev.fetchedAt }));
  }, []);

  return { ...state, isInitialLoad: state.loading && state.data === null, run, cancel };
}
