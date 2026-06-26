import { describe, it, expect } from "vitest";
import { asyncReducer, initialAsyncState, type AsyncState } from "./asyncState";

describe("asyncReducer", () => {
  it("starts in the loading state", () => {
    expect(initialAsyncState.status).toBe("loading");
  });

  it("'start' moves any state back to loading (refetch)", () => {
    const prev: AsyncState<number> = { status: "success", data: 5 };
    expect(asyncReducer(prev, { type: "start" })).toEqual({ status: "loading" });
  });

  it("'success' stores the data", () => {
    const next = asyncReducer(initialAsyncState as AsyncState<number[]>, {
      type: "success",
      data: [1, 2, 3],
    });
    expect(next).toEqual({ status: "success", data: [1, 2, 3] });
  });

  it("'success' with an empty array is still success (not loading)", () => {
    const next = asyncReducer(initialAsyncState as AsyncState<number[]>, {
      type: "success",
      data: [],
    });
    expect(next.status).toBe("success");
    expect(next).toEqual({ status: "success", data: [] });
  });

  it("'error' stores the message", () => {
    const next = asyncReducer(initialAsyncState, { type: "error", error: "boom" });
    expect(next).toEqual({ status: "error", error: "boom" });
  });
});
