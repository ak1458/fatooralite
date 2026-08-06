"use client";
import { useSyncExternalStore } from "react";

/**
 * Returns true when viewport width is at or below `maxWidth`.
 * SSR-safe: defaults to `false` (desktop-first).
 */
export function useMediaQuery(maxWidth: number): boolean {
  const query = `(max-width: ${maxWidth}px)`;

  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
