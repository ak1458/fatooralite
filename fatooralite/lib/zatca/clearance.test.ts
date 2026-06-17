import { describe, it, expect } from "vitest";
import { validateInvoice } from "./validate";
import { ZatcaClient } from "./client";
import type { InvoiceInput } from "./types";

const standard: InvoiceInput = {
  invoiceNumber: "INV-1",
  kind: "standard",
  issueDate: "2026-06-17",
  seller: { name: "Almarai", vatNumber: "311122334400003" },
  buyer: { name: "Tamimi", vatNumber: "300000000000003" },
  lines: [{ description: "Milk", quantity: 10, unitPrice: 12 }],
};

describe("validateInvoice", () => {
  it("passes a well-formed standard invoice", () => {
    expect(validateInvoice(standard)).toBeNull();
  });
  it("rejects a standard invoice with no buyer VAT", () => {
    expect(validateInvoice({ ...standard, buyer: undefined })?.code).toBe("BR-KSA-44");
  });
  it("rejects a bad seller VAT", () => {
    expect(validateInvoice({ ...standard, seller: { name: "X", vatNumber: "123" } })?.code).toBe(
      "BR-KSA-39",
    );
  });
  it("allows simplified without a buyer", () => {
    expect(validateInvoice({ ...standard, kind: "simplified", buyer: undefined })).toBeNull();
  });
  it("rejects non-positive quantity", () => {
    expect(
      validateInvoice({ ...standard, lines: [{ description: "x", quantity: 0, unitPrice: 1 }] })?.code,
    ).toBe("BR-KSA-21");
  });
});

describe("ZatcaClient (simulation)", () => {
  const client = new ZatcaClient("simulation");
  const args = { input: standard, signedXmlBase64: "PHhtbC8+", hash: "HASH==" };

  it("clears a valid standard invoice", async () => {
    const r = await client.submit(args);
    expect(r.action).toBe("clearance");
    expect(r.status).toBe("accepted");
    expect(r.icv).toBeGreaterThan(0);
  });
  it("reports a simplified invoice", async () => {
    const r = await client.submit({ ...args, input: { ...standard, kind: "simplified", buyer: undefined } });
    expect(r.action).toBe("reporting");
    expect(r.status).toBe("accepted");
    expect(r.code).toBe("REPORTED");
  });
  it("rejects an invalid invoice with a BR-KSA code", async () => {
    const r = await client.submit({ ...args, input: { ...standard, buyer: undefined } });
    expect(r.status).toBe("rejected");
    expect(r.code).toBe("BR-KSA-44");
  });
});
