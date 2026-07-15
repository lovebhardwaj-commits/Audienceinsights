"use client";

import { useCallback, useState } from "react";

interface JsonReportState<T> {
  loading: boolean;
  data: T | null;
  error: string | null;
}

export function useJsonReport<T>() {
  const [state, setState] = useState<JsonReportState<T>>({ loading: false, data: null, error: null });

  const run = useCallback(async (url: string) => {
    // Hold the previous render during a refetch instead of flashing back to a skeleton —
    // only a fresh mount with no prior data should show the initial loading state.
    setState((prev) => ({ loading: true, data: prev.data, error: null }));
    try {
      const res = await fetch(url);
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      setState({ loading: false, data: body as T, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setState((prev) => ({ loading: false, data: prev.data, error: message }));
    }
  }, []);

  return { ...state, isInitialLoad: state.loading && state.data === null, run };
}
