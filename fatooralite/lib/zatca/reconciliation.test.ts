import { describe, it, expect } from "vitest";
import { netSign, netEffect, sumNet } from "./reconciliation";

describe("netSign", () => {
  it("is negative for credit notes", () => {
    expect(netSign("credit")).toBe(-1);
  });
  it("is positive for debit notes", () => {
    expect(netSign("debit")).toBe(1);
  });
  it("is positive for ordinary invoices", () => {
    expect(netSign("invoice")).toBe(1);
  });
});

describe("netEffect", () => {
  it("negates a credit note's stored (positive) amounts", () => {
    const net = netEffect({ documentType: "credit", taxableAmount: 100, vatAmount: 15, grandTotal: 115 });
    expect(net).toEqual({ taxableAmount: -100, vatAmount: -15, grandTotal: -115 });
  });

  it("leaves a debit note's amounts positive", () => {
    const net = netEffect({ documentType: "debit", taxableAmount: 50, vatAmount: 7.5, grandTotal: 57.5 });
    expect(net).toEqual({ taxableAmount: 50, vatAmount: 7.5, grandTotal: 57.5 });
  });

  it("leaves an ordinary invoice's amounts positive", () => {
    const net = netEffect({ documentType: "invoice", taxableAmount: 900, vatAmount: 135, grandTotal: 1035 });
    expect(net).toEqual({ taxableAmount: 900, vatAmount: 135, grandTotal: 1035 });
  });
});

describe("sumNet", () => {
  it("reduces the total when a credit note corrects an earlier invoice — the live D9 bug", () => {
    const total = sumNet([
      { documentType: "invoice", taxableAmount: 1000, vatAmount: 150, grandTotal: 1150 },
      { documentType: "credit", taxableAmount: 1000, vatAmount: 150, grandTotal: 1150 },
    ]);
    // A full-amount credit note against the only invoice must net to zero,
    // not double the total (the bug this fixes: 1000+1000=2000 instead of 0).
    expect(total).toEqual({ taxableAmount: 0, vatAmount: 0, grandTotal: 0 });
  });

  it("adds a debit note on top of the original invoice", () => {
    const total = sumNet([
      { documentType: "invoice", taxableAmount: 1000, vatAmount: 150, grandTotal: 1150 },
      { documentType: "debit", taxableAmount: 100, vatAmount: 15, grandTotal: 115 },
    ]);
    expect(total).toEqual({ taxableAmount: 1100, vatAmount: 165, grandTotal: 1265 });
  });

  it("returns zeros for an empty set", () => {
    expect(sumNet([])).toEqual({ taxableAmount: 0, vatAmount: 0, grandTotal: 0 });
  });

  it("rounds to 2 decimal places across many small documents", () => {
    const invoices = Array.from({ length: 3 }, () => ({
      documentType: "invoice",
      taxableAmount: 0.03,
      vatAmount: 0.0045,
      grandTotal: 0.0345,
    }));
    const total = sumNet(invoices);
    expect(total.taxableAmount).toBe(0.09);
  });
});
