"use client";
import { useAsyncData } from "@/lib/async/useAsyncData";
import type { FlagName } from "./registry";

/**
 * Resolved flags for the signed-in user's own company. Used only to decide
 * what to render (e.g. whether to show the Import button) — enforcement
 * always happens server-side, independently, on the route the flag gates.
 * Fails closed on a load error: an unresolved flag hides the control it
 * would have unlocked rather than showing one that 403s on click.
 */
export function useFlags(): { flags: Partial<Record<FlagName, boolean>>; isLoading: boolean } {
  const { state } = useAsyncData<Record<FlagName, boolean>>(async (signal) => {
    const res = await fetch("/api/flags", { signal });
    if (!res.ok) return {} as Record<FlagName, boolean>;
    const data = await res.json();
    return data.flags ?? {};
  }, []);

  return {
    flags: state.status === "success" ? state.data : {},
    isLoading: state.status === "loading",
  };
}
