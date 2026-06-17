import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LangProvider } from "@/lib/i18n/LangProvider";
import { LangToggle } from "./LangToggle";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("dir");
});

describe("LangToggle", () => {
  it("switches dir to ltr when EN clicked", () => {
    render(
      <LangProvider initial="ar">
        <LangToggle />
      </LangProvider>,
    );
    act(() => screen.getByRole("button", { name: "EN" }).click());
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
  });
  it("switches back to rtl when ع clicked", () => {
    render(
      <LangProvider initial="en">
        <LangToggle />
      </LangProvider>,
    );
    act(() => screen.getByRole("button", { name: "ع" }).click());
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
  });
});
