import { describe, it, expect } from "vitest";
import { confirmSummary } from "./tools";

// Regression coverage for a same-day fix: the confirm-before-write gate was
// extended from createInvoice/submitInvoice to addCustomer/addProduct too,
// so a successful prompt-injection can't silently mutate tenant data without
// a human seeing a plain-English summary first. Locks in which tools require
// that gate.

describe("confirmSummary", () => {
  it("requires confirmation for addCustomer", () => {
    const summary = confirmSummary("addCustomer", JSON.stringify({ name: "Acme", city: "Riyadh" }));
    expect(summary).toContain("Acme");
    expect(summary).not.toBeNull();
  });

  it("requires confirmation for addProduct", () => {
    const summary = confirmSummary("addProduct", JSON.stringify({ name: "Widget", unitPrice: 42 }));
    expect(summary).toContain("Widget");
    expect(summary).not.toBeNull();
  });

  it("requires confirmation for createInvoice and submitInvoice", () => {
    expect(confirmSummary("createInvoice", JSON.stringify({ kind: "standard", lines: [] }))).not.toBeNull();
    expect(confirmSummary("submitInvoice", JSON.stringify({ invoiceNumber: "INV-1" }))).not.toBeNull();
  });

  it("does not require confirmation for read-only tools", () => {
    expect(confirmSummary("listInvoices", "{}")).toBeNull();
    expect(confirmSummary("listCustomers", "{}")).toBeNull();
    expect(confirmSummary("getComplianceStats", "{}")).toBeNull();
  });

  it("returns null for an unknown tool name", () => {
    expect(confirmSummary("notATool", "{}")).toBeNull();
  });

  it("falls back to best-effort args on malformed JSON rather than throwing", () => {
    expect(() => confirmSummary("addCustomer", "{not json")).not.toThrow();
    expect(confirmSummary("addCustomer", "{not json")).toBe('Create customer "".');
  });
});
