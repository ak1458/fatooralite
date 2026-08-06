import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAsyncData } from "./useAsyncData";

describe("useAsyncData", () => {
  it("starts loading then resolves to success with data", async () => {
    const { result } = renderHook(() => useAsyncData(async () => [1, 2, 3], []));
    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(result.current.state).toEqual({ status: "success", data: [1, 2, 3] });
  });

  it("moves to error when the fetcher rejects", async () => {
    const { result } = renderHook(() =>
      useAsyncData(async () => {
        throw new Error("nope");
      }, []),
    );
    await waitFor(() => expect(result.current.state.status).toBe("error"));
    expect(result.current.state).toEqual({ status: "error", error: "nope" });
  });

  it("retry re-runs the fetcher and can recover", async () => {
    let calls = 0;
    const fetcher = vi.fn(async () => {
      calls++;
      if (calls === 1) throw new Error("first fails");
      return ["ok"];
    });
    const { result } = renderHook(() => useAsyncData(fetcher, []));
    await waitFor(() => expect(result.current.state.status).toBe("error"));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(result.current.state).toEqual({ status: "success", data: ["ok"] });
  });

  it("stays loading while disabled (e.g. dependency not ready)", () => {
    const fetcher = vi.fn(async () => "data");
    const { result } = renderHook(() => useAsyncData(fetcher, [], { enabled: false }));
    expect(result.current.state.status).toBe("loading");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
