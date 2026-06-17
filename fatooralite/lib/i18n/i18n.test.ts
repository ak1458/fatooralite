import { describe, it, expect } from "vitest";
import { ar } from "./ar";
import { en } from "./en";

describe("dictionaries", () => {
  it("ar and en have identical key sets", () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });
  it("no empty strings", () => {
    for (const v of Object.values(ar)) expect(v).not.toBe("");
    for (const v of Object.values(en)) expect(v).not.toBe("");
  });
});
