/**
 * Tiny async state machine shared by every data-loading view. Distinguishes
 * loading / success / error so the UI never shows an infinite "Loading…" when a
 * request has actually failed or returned empty.
 */

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: T };

export type AsyncAction<T> =
  | { type: "start" }
  | { type: "success"; data: T }
  | { type: "error"; error: string };

export const initialAsyncState: AsyncState<never> = { status: "loading" };

export function asyncReducer<T>(_state: AsyncState<T>, action: AsyncAction<T>): AsyncState<T> {
  switch (action.type) {
    case "start":
      return { status: "loading" };
    case "success":
      return { status: "success", data: action.data };
    case "error":
      return { status: "error", error: action.error };
  }
}
