"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { asyncReducer, initialAsyncState, type AsyncState } from "./asyncState";

interface Options {
  /** When false, the fetcher is not run and the hook stays in `loading` (e.g. waiting for a companyId). */
  enabled?: boolean;
  /** Safety net so a hung request becomes an error instead of an infinite spinner. */
  timeoutMs?: number;
}

/**
 * Fetch-on-deps with explicit loading/success/error states, a retry trigger, and
 * a timeout. Pair with <AsyncBoundary> for consistent UI. The fetcher receives an
 * AbortSignal and is read via a ref, so passing an inline async fn is safe.
 */
export function useAsyncData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
  opts: Options = {},
): { state: AsyncState<T>; retry: () => void } {
  const { enabled = true, timeoutMs = 20000 } = opts;
  const [state, dispatch] = useReducer(asyncReducer<T>, initialAsyncState as AsyncState<T>);
  const [nonce, setNonce] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let settled = false;

    dispatch({ type: "start" });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      controller.abort();
      dispatch({ type: "error", error: "Request timed out. Please retry." });
    }, timeoutMs);

    fetcherRef.current(controller.signal).then(
      (data) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        dispatch({ type: "success", data });
      },
      (err) => {
        if (settled || controller.signal.aborted) return;
        settled = true;
        clearTimeout(timer);
        dispatch({ type: "error", error: err instanceof Error ? err.message : String(err) });
      },
    );

    return () => {
      settled = true;
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, timeoutMs, ...deps]);

  return { state, retry };
}
