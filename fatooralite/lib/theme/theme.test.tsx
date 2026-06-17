import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeProvider";

function Probe() {
  const { theme, toggle } = useTheme();
  return <button onClick={toggle}>{theme}</button>;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("ThemeProvider", () => {
  it("defaults to dark and toggles to light", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    const btn = screen.getByRole("button");
    expect(btn.textContent).toBe("dark");
    act(() => btn.click());
    expect(btn.textContent).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("fl-theme")).toBe("light");
  });
});
