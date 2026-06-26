import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AsyncBoundary } from "./AsyncBoundary";
import type { AsyncState } from "@/lib/async/asyncState";

describe("AsyncBoundary", () => {
  it("shows a loading indicator while loading", () => {
    render(
      <AsyncBoundary state={{ status: "loading" } as AsyncState<number[]>}>
        {(d) => <div>{d.length} items</div>}
      </AsyncBoundary>,
    );
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("shows the error message and a working retry button on error", () => {
    const onRetry = vi.fn();
    render(
      <AsyncBoundary state={{ status: "error", error: "Network down" }} onRetry={onRetry}>
        {() => <div>never</div>}
      </AsyncBoundary>,
    );
    expect(screen.getByText("Network down")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders the empty state when loaded but empty", () => {
    render(
      <AsyncBoundary
        state={{ status: "success", data: [] as number[] }}
        isEmpty={(d) => d.length === 0}
        empty={<div>Nothing here yet</div>}
      >
        {(d) => <div>{d.length} items</div>}
      </AsyncBoundary>,
    );
    expect(screen.getByText("Nothing here yet")).toBeTruthy();
  });

  it("renders children with data when loaded and non-empty", () => {
    render(
      <AsyncBoundary
        state={{ status: "success", data: [1, 2, 3] }}
        isEmpty={(d) => d.length === 0}
      >
        {(d) => <div>{d.length} items</div>}
      </AsyncBoundary>,
    );
    expect(screen.getByText("3 items")).toBeTruthy();
  });
});
