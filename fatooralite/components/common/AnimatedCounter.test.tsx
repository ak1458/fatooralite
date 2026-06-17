import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnimatedCounter } from "./AnimatedCounter";

describe("AnimatedCounter", () => {
  it("reaches the final formatted value", async () => {
    render(
      <div>
        <AnimatedCounter to={100} duration={10} format={(n) => String(Math.round(n))} />
      </div>,
    );
    expect(await screen.findByText("100")).toBeTruthy();
  });
});
