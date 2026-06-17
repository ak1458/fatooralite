import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Icon } from "./Icon";

describe("Icon", () => {
  it("renders an svg for a known name", () => {
    const { container } = render(<Icon name="dashboard" />);
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelectorAll("rect").length).toBe(4);
  });
  it("renders empty svg for unknown name", () => {
    const { container } = render(<Icon name="nope" />);
    expect(container.querySelector("svg")?.children.length).toBe(0);
  });
});
