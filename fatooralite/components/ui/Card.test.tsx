import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "./Card";
import { Pill } from "./Pill";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>hi</Card>);
    expect(screen.getByText("hi")).toBeTruthy();
  });
});

describe("Pill", () => {
  it("renders label", () => {
    render(
      <Pill bg="var(--acs)" fg="var(--ac)" dot>
        Cleared
      </Pill>,
    );
    expect(screen.getByText("Cleared")).toBeTruthy();
  });
});
