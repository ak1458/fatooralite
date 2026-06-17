import { describe, it, expect } from "vitest";
import { sar, num, vatOf } from "./format";

describe("num", () => {
  it("formats with grouping", () => {
    expect(num(1284500, "en")).toBe("1,284,500");
    expect(num(1284500, "ar")).toBe("1,284,500");
  });
});

describe("sar", () => {
  it("prefixes SAR in en", () => {
    expect(sar(45200, "en")).toBe("SAR 45,200");
  });
  it("suffixes ر.س in ar", () => {
    expect(sar(45200, "ar")).toBe("45,200 ر.س");
  });
});

describe("vatOf", () => {
  it("computes 15% rounded", () => {
    expect(vatOf(45200)).toBe(6780);
    expect(vatOf(8750)).toBe(1313);
  });
});
