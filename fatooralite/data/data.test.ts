import { describe, it, expect } from "vitest";
import { navGroups, liveIds } from "./nav";

describe("nav config", () => {
  it("nav has 5 groups and 6 live ids", () => {
    expect(navGroups).toHaveLength(5);
    expect(liveIds).toHaveLength(6);
  });
});
