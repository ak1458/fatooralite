import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  it("merges classes cleanly", () => {
    expect(cn("px-4 py-2", "text-sm")).toBe("px-4 py-2 text-sm");
  });

  it("handles conditional classes", () => {
    const active = true;
    const disabled = false;
    expect(cn("btn", active && "btn-active", disabled && "btn-disabled")).toBe("btn btn-active");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("px-4 px-8", "text-red-500 text-blue-500")).toBe("px-8 text-blue-500");
  });
});
