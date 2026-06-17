import { describe, it, expect } from "vitest";
import { invoices } from "./invoices";
import { navGroups, liveIds } from "./nav";
import { feed, clearanceFeed } from "./feed";
import { services } from "./services";

describe("mock data", () => {
  it("has 10 invoices with bilingual customers", () => {
    expect(invoices).toHaveLength(10);
    for (const r of invoices) {
      expect(r.customer.ar).toBeTruthy();
      expect(r.customer.en).toBeTruthy();
    }
  });
  it("nav has 5 groups and 6 live ids", () => {
    expect(navGroups).toHaveLength(5);
    expect(liveIds).toHaveLength(6);
  });
  it("feeds are sized per design", () => {
    expect(feed).toHaveLength(5);
    expect(clearanceFeed).toHaveLength(9);
  });
  it("has 8 services with one degraded", () => {
    expect(services).toHaveLength(8);
    expect(services.filter((s) => s.ok === "degraded")).toHaveLength(1);
  });
});
