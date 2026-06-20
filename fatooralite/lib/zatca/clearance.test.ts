import { describe, it, expect, vi, afterEach } from "vitest";
import { validateInvoice } from "./validate";
import { ZatcaClient, MissingCredentialsError } from "./client";
import type { InvoiceInput } from "./types";

const standard: InvoiceInput = {
  invoiceNumber: "INV-1",
  kind: "standard",
  issueDate: "2026-06-17",
  seller: { name: "Almarai", vatNumber: "311122334400003" },
  buyer: { name: "Tamimi", vatNumber: "300000000000003" },
  lines: [{ description: "Milk", quantity: 10, unitPrice: 12 }],
};

const args = { input: standard, uuid: "u-1", signedXmlBase64: "PHhtbC8+", hash: "HASH==" };
const creds = { token: "dGVzdC10b2tlbg==", secret: "s3cr3t" };

afterEach(() => vi.unstubAllGlobals());

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

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

describe("ZatcaClient", () => {
  it("rejects locally before any network call", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const client = new ZatcaClient(creds);
    const r = await client.submit({ ...args, input: { ...standard, buyer: undefined } });
    expect(r.status).toBe("rejected");
    expect(r.code).toBe("BR-KSA-44");
    expect(spy).not.toHaveBeenCalled();
  });

  it("requires credentials for a valid invoice", async () => {
    const client = new ZatcaClient();
    await expect(client.submit(args)).rejects.toBeInstanceOf(MissingCredentialsError);
  });

  it("clears a valid standard invoice via the gateway", async () => {
    mockFetch(200, { clearanceStatus: "CLEARED", clearedInvoice: "Y2xlYXJlZA==" });
    const client = new ZatcaClient(creds);
    const r = await client.submit(args);
    expect(r.action).toBe("clearance");
    expect(r.status).toBe("accepted");
    expect(r.clearedInvoiceBase64).toBe("Y2xlYXJlZA==");
  });

  it("reports a simplified invoice", async () => {
    mockFetch(200, { reportingStatus: "REPORTED" });
    const client = new ZatcaClient(creds);
    const r = await client.submit({ ...args, input: { ...standard, kind: "simplified", buyer: undefined } });
    expect(r.action).toBe("reporting");
    expect(r.status).toBe("accepted");
  });

  it("treats a gateway error as rejected", async () => {
    mockFetch(400, { errors: ["bad"] });
    const client = new ZatcaClient(creds);
    const r = await client.submit(args);
    expect(r.status).toBe("rejected");
  });
});
