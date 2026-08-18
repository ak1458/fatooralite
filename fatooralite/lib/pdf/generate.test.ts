// @vitest-environment node
import { randomBytes } from "node:crypto";
import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { Prisma } from "@prisma/client";
import type { Invoice, InvoiceLine } from "@prisma/client";
import { generatePdf } from "./generate";

/**
 * Before this, any Arabic character anywhere in an invoice aborted PDF
 * generation with `WinAnsi cannot encode "ش" (0x0634)` — a signed, numbered,
 * filed invoice that could never be printed or sent. These tests use the real
 * generator and the real embedded font; nothing is mocked.
 */

// Real Prisma Decimal: money columns arrive as Decimal from the database and
// the generator both formats them and passes them through num().
const d = (n: number) => new Prisma.Decimal(n);

function invoice(over: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv1", companyId: "co1", branchId: null, customerId: null,
    invoiceNumber: "INV-2026-00001", uuid: "u-1", kind: "standard", documentType: "invoice",
    status: "signed", issueDate: "2026-08-14", issueTime: "10:00:00",
    buyerName: "Acme Trading", buyerVat: "300000000000103",
    taxableAmount: d(100), vatAmount: d(15), grandTotal: d(115),
    xml: null, signedXml: null, hash: null, previousHash: null, signature: null,
    qr: null, resultCode: null, reportingState: "n/a", reportingDeadline: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...over,
  } as Invoice;
}

function line(description: string): InvoiceLine {
  return {
    id: "l1", invoiceId: "inv1", description, quantity: 2,
    unitPrice: d(50),
    vatRate: 0.15,
    netAmount: d(100),
    vatAmount: d(15),
  } as InvoiceLine;
}

async function render(inv: Invoice, opts: Parameters<typeof generatePdf>[1] = {}) {
  const bytes = await generatePdf(inv, opts);
  expect(bytes.length).toBeGreaterThan(1000);
  // Parse it back: a byte stream that pdf-lib cannot reopen is not a PDF.
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(1);
  return bytes;
}

describe("generatePdf — Arabic", () => {
  it("renders an invoice whose buyer name is Arabic", async () => {
    await render(invoice({ buyerName: "شركة الفيصل التجارية" }));
  }, 60_000);

  it("renders an invoice whose seller name is Arabic", async () => {
    await render(invoice(), {
      seller: { name: "Alpha Trading Co", nameAr: "شركة ألفا التجارية", vatNumber: "300000000000103" },
    });
  }, 60_000);

  it("renders Arabic line-item descriptions", async () => {
    await render(invoice(), { lines: [line("خدمات استشارية")] });
  }, 60_000);

  it("renders mixed Arabic and Latin in one field", async () => {
    await render(invoice({ buyerName: "Faisal شركة Trading" }), {
      lines: [line("Item منتج 1")],
    });
  }, 60_000);

  it("renders Arabic-Indic digits", async () => {
    await render(invoice({ buyerName: "عميل ١٢٣" }));
  }, 60_000);

  it("renders an Arabic credit note", async () => {
    await render(invoice({ documentType: "credit", buyerName: "شركة الفيصل" }));
  }, 60_000);

  it("renders a long Arabic description without throwing", async () => {
    await render(invoice(), { lines: [line("خدمات استشارية ومحاسبية شاملة لجميع الشركات في المملكة العربية السعودية")] });
  }, 60_000);

  it("preserves Arabic characters — no substitution or transliteration", async () => {
    // The generator must never swap an unrenderable character for a placeholder.
    // Two invoices differing only in Arabic content must produce different bytes;
    // if both were being replaced by "?" they would not.
    const a = await generatePdf(invoice({ buyerName: "شركة الفيصل" }));
    const b = await generatePdf(invoice({ buyerName: "شركة النخيل" }));
    expect(Buffer.compare(Buffer.from(a), Buffer.from(b))).not.toBe(0);
  }, 60_000);
});

describe("generatePdf — English regression", () => {
  it("still renders a plain English invoice", async () => {
    await render(invoice());
  }, 60_000);

  it("still renders English line items, totals and a seller block", async () => {
    await render(invoice(), {
      seller: { name: "Alpha Trading Co", vatNumber: "300000000000103", address: "King Fahd Road, Riyadh" },
      lines: [line("Consulting services")],
    });
  }, 60_000);

  it("handles the em dash used for an invoice with no lines", async () => {
    await render(invoice({ buyerName: null }));
  }, 60_000);

  it("renders a QR code when one is present", async () => {
    const withQr = await render(invoice({ qr: Buffer.from("test-qr-payload").toString("base64") }));
    const without = await generatePdf(invoice());
    expect(withQr.length).toBeGreaterThan(without.length);
  }, 60_000);

  it("attaches the signed XML when supplied", async () => {
    // The attachment lives in a compressed object stream, so it is asserted by
    // behaviour — the document still parses and carries the extra payload —
    // rather than by scanning raw bytes for a filename.
    // Random content, because a repeated string compresses to almost nothing
    // and the size comparison would then prove nothing.
    const xml = `<Invoice>${randomBytes(2048).toString("hex")}</Invoice>`;
    const withXml = await render(invoice(), { xml });
    const without = await generatePdf(invoice());
    expect(withXml.length).toBeGreaterThan(without.length + 2000);
  }, 60_000);
});
