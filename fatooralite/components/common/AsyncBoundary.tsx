"use client";
import type { ReactNode } from "react";
import type { AsyncState } from "@/lib/async/asyncState";

interface AsyncBoundaryProps<T> {
  state: AsyncState<T>;
  children: (data: T) => ReactNode;
  /** Treat a successful-but-empty result distinctly (e.g. `d => d.length === 0`). */
  isEmpty?: (data: T) => boolean;
  loading?: ReactNode;
  empty?: ReactNode;
  onRetry?: () => void;
}

/**
 * Renders exactly one of: loading / error(+retry) / empty / data. Removes the
 * "infinite spinner" class of bug by making a failed or empty load visually
 * distinct from a still-loading one.
 */
export function AsyncBoundary<T>({
  state,
  children,
  isEmpty,
  loading,
  empty,
  onRetry,
}: AsyncBoundaryProps<T>) {
  if (state.status === "loading") {
    return loading ?? <DefaultLoading />;
  }
  if (state.status === "error") {
    return <DefaultError message={state.error} onRetry={onRetry} />;
  }
  if (isEmpty?.(state.data)) {
    return <>{empty ?? <DefaultEmpty />}</>;
  }
  return <>{children(state.data)}</>;
}

function DefaultLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: "var(--t3)" }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: "2.5px solid var(--bd)",
          borderTopColor: "var(--ac)",
          animation: "flSpin .7s linear infinite",
        }}
      />
    </div>
  );
}

function DefaultError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: 40,
        textAlign: "center",
      }}
    >
      <div style={{ color: "var(--dang)", fontSize: 14, fontWeight: 600 }}>
        Something went wrong
      </div>
      <div style={{ color: "var(--t3)", fontSize: 13, maxWidth: 360 }}>{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: "8px 16px",
            borderRadius: 10,
            border: "1px solid var(--bd)",
            background: "var(--s1)",
            color: "var(--tx)",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

function DefaultEmpty() {
  return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--t3)", fontSize: 13.5 }}>
      No data yet.
    </div>
  );
}
