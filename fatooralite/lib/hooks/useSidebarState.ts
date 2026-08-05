"use client";
import { useState, useEffect, useCallback, useSyncExternalStore } from "react";

export type SidebarMode = "full" | "collapsed" | "drawer";

interface SidebarState {
  /** Current layout mode based on viewport width. */
  mode: SidebarMode;
  /** Whether the drawer is currently open (only meaningful in drawer mode). */
  open: boolean;
  /** Toggle the drawer open/closed. */
  toggle: () => void;
  /** Close the drawer. */
  close: () => void;
}

/** Breakpoints matching the responsive design spec. */
const BP_TABLET = 1024;
const BP_MOBILE = 768;

function getMode(width: number): SidebarMode {
  if (width < BP_MOBILE) return "drawer";
  if (width < BP_TABLET) return "collapsed";
  return "full";
}

function subscribe(cb: () => void): () => void {
  const mql1 = window.matchMedia(`(max-width: ${BP_MOBILE - 1}px)`);
  const mql2 = window.matchMedia(`(max-width: ${BP_TABLET - 1}px)`);
  mql1.addEventListener("change", cb);
  mql2.addEventListener("change", cb);
  return () => {
    mql1.removeEventListener("change", cb);
    mql2.removeEventListener("change", cb);
  };
}

function getSnapshot(): SidebarMode {
  return getMode(window.innerWidth);
}

function getServerSnapshot(): SidebarMode {
  return "full";
}

/**
 * Hook that tracks the sidebar's responsive mode and drawer open state.
 *
 * - `full` (≥1024px): sidebar visible at 264px
 * - `collapsed` (768–1023px): sidebar at 64px, icons only
 * - `drawer` (<768px): sidebar hidden, toggle via hamburger
 */
export function useSidebarState(): SidebarState {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [open, setOpen] = useState(false);

  // Auto-close the drawer when viewport widens past mobile
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (mode !== "drawer") setOpen(false);
  }, [mode]);

  const toggle = useCallback(() => setOpen((o) => !o), []);
  const close = useCallback(() => setOpen(false), []);

  return { mode, open, toggle, close };
}
