"use client";

import { useCallback, useRef, useState } from "react";
import type { NdjsonEvent } from "@/lib/stream";

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
}

export function useStreamingReport<T>() {
  const [state, setState] = useState<StreamingReportState<T>>({
    loading: false,
    progress: null,
    data: null,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (url: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Hold the previous render during a refetch instead of flashing back to a skeleton —
    // only a fresh mount with no prior data should show the initial loading state.
    setState((prev) => ({ loading: true, progress: null, data: prev.data, error: null }));

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
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
          } else if (event.type === "done") {
            setState({ loading: false, progress: null, data: event.data as T, error: null });
          } else if (event.type === "error") {
            setState((prev) => ({ loading: false, progress: null, data: prev.data, error: event.message }));
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Something went wrong";
      setState((prev) => ({ loading: false, progress: null, data: prev.data, error: message }));
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ loading: false, progress: null, data: prev.data, error: "Cancelled" }));
  }, []);

  return { ...state, isInitialLoad: state.loading && state.data === null, run, cancel };
}
