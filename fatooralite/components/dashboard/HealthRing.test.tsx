import { describe, it, expect } from "vitest";
import { ringOffset, RING_CIRCUMFERENCE } from "./HealthRing";

describe("HealthRing math", () => {
  it("offset is 0 at 100 and full circumference at 0", () => {
    expect(ringOffset(100)).toBeCloseTo(0, 1);
    expect(ringOffset(0)).toBeCloseTo(RING_CIRCUMFERENCE, 1);
  });
  it("offset is half circumference at 50", () => {
    expect(ringOffset(50)).toBeCloseTo(RING_CIRCUMFERENCE / 2, 1);
  });
});
