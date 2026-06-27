import { describe, it, expect } from "vitest";
import { parseActionJson, listActions } from "./actions";

describe("parseActionJson", () => {
  it("parses a bare JSON object", () => {
    expect(parseActionJson('{"action":"generateReport","params":{"rangeDays":7}}')).toEqual({
      action: "generateReport",
      params: { rangeDays: 7 },
    });
  });

  it("parses JSON inside a code fence with surrounding prose", () => {
    const text = 'Sure!\n```json\n{"action":"addCustomer","params":{"name":"ACME"}}\n```\nDone.';
    expect(parseActionJson(text)).toEqual({ action: "addCustomer", params: { name: "ACME" } });
  });

  it("defaults params to an empty object when absent", () => {
    expect(parseActionJson('{"action":"navigate"}')).toEqual({ action: "navigate", params: {} });
  });

  it("returns null when there is no action", () => {
    expect(parseActionJson("I cannot help with that.")).toBeNull();
    expect(parseActionJson('{"foo":1}')).toBeNull();
  });
});

describe("listActions", () => {
  it("exposes the registered actions", () => {
    const names = listActions().map((a) => a.name);
    expect(names).toContain("generateReport");
    expect(names).toContain("addCustomer");
    expect(names).toContain("addProduct");
  });
});
