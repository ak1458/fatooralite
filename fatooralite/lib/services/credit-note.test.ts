// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { issueInvoice } from "@/lib/services/invoice-service";
import { generateKeyPair } from "@/lib/zatca/index";
import type { InvoiceInput } from "@/lib/zatca/types";

/**
 * Phase 3 / N8 — credit/debit notes were modelled (InvoiceInput,
 * buildInvoiceXml's InvoiceTypeCode/BillingReference, BR-KSA-56/57
 * validation, a full UI) but never verified end to end, and
 * billingReferenceId/instructionNote were never persisted on the Invoice row
 * itself (only baked into the XML text). This proves the whole path: issue
 * an original standard invoice, issue a credit note referencing it, and
 * check every layer — DB link, chain integrity, and the actual signed XML.
 *
 * What this test deliberately does NOT assert: that VAT totals/reports
 * subtract the credit note's amount from the period total. They don't —
 * see docs/audit/decision-register.md D9, filed rather than fixed, per the
 * phase's "don't invent business rules" instruction.
 */
let db: PrismaClient;
let companyId: string;
// ZATCA VAT format: /^3\d{13}3$/ — must both start AND end with 3.
const VAT = "300000000000873";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const company = await db.company.create({ data: { name: "Credit Note Co", vatNumber: VAT } });
  companyId = company.id;
  await db.subscription.create({ data: { companyId, plan: "pro", status: "active" } });

  const kp = generateKeyPair();
  await db.certificate.create({
    data: {
      companyId, kind: "production", status: "active",
      privateKey: kp.privateKeyPem, publicKey: kp.publicKeyPem,
      token: "test-token", secret: "test-secret",
    },
  });
}, 180_000);

afterAll(async () => {
  if (!db) return;
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("credit note issuance end-to-end (N8)", () => {
  it("links to, chains after, and correctly types a note against the original invoice", async () => {
    const original: InvoiceInput = {
      invoiceNumber: "",
      kind: "standard",
      issueDate: "2026-08-12",
      issueTime: "09:00:00",
      seller: { name: "Credit Note Co", vatNumber: VAT },
      buyer: { name: "Buyer Co", vatNumber: "300000000000883" },
      lines: [{ description: "Widget", quantity: 2, unitPrice: 100 }],
    };
    const originalResult = await issueInvoice(companyId, original, db);
    const originalRow = await db.invoice.findUniqueOrThrow({ where: { id: originalResult.invoiceId } });
    expect(originalRow.documentType).toBe("invoice");
    expect(originalRow.hash).toBeTruthy();

    const note: InvoiceInput = {
      invoiceNumber: "",
      kind: "standard",
      documentType: "credit",
      issueDate: "2026-08-12",
      issueTime: "10:00:00",
      seller: { name: "Credit Note Co", vatNumber: VAT },
      buyer: { name: "Buyer Co", vatNumber: "300000000000883" },
      billingReferenceId: originalRow.invoiceNumber,
      instructionNote: "Returned goods",
      lines: [{ description: "Widget", quantity: 2, unitPrice: 100 }],
    };
    const noteResult = await issueInvoice(companyId, note, db);
    const noteRow = await db.invoice.findUniqueOrThrow({ where: { id: noteResult.invoiceId } });

    // --- DB link (soft-link resolved to a real row, N8's core gap) ---
    expect(noteRow.documentType).toBe("credit");
    expect(noteRow.billingReferenceId).toBe(originalRow.invoiceNumber);
    expect(noteRow.instructionNote).toBe("Returned goods");
    expect(noteRow.referencedInvoiceId).toBe(originalRow.id);

    // --- Chain integrity: the note is the NEXT slot in the same PIH chain,
    // not a side chain or a skipped slot ---
    expect(noteRow.previousHash).toBe(originalRow.hash);
    expect(noteRow.hash).not.toBe(originalRow.hash);

    // --- Signed XML: correct UBL type code and a real BillingReference ---
    const xml = noteRow.signedXml ?? "";
    expect(xml).toContain('<cbc:InvoiceTypeCode name="0100000">381</cbc:InvoiceTypeCode>');
    expect(xml).toContain("<cac:BillingReference>");
    expect(xml).toContain(`<cbc:ID>${originalRow.invoiceNumber}</cbc:ID>`);
    expect(xml).toContain("<cbc:Note>Returned goods</cbc:Note>");
  }, 40_000);

  it("resolving the same billingReferenceId twice still points both notes at one original (not last-write-wins)", async () => {
    const original: InvoiceInput = {
      invoiceNumber: "",
      kind: "standard",
      issueDate: "2026-08-12",
      issueTime: "09:00:00",
      seller: { name: "Credit Note Co", vatNumber: VAT },
      buyer: { name: "Buyer Co", vatNumber: "300000000000883" },
      lines: [{ description: "Gadget", quantity: 1, unitPrice: 50 }],
    };
    const originalResult = await issueInvoice(companyId, original, db);
    const originalRow = await db.invoice.findUniqueOrThrow({ where: { id: originalResult.invoiceId } });

    const noteInput = (reason: string): InvoiceInput => ({
      invoiceNumber: "",
      kind: "standard",
      documentType: "credit",
      issueDate: "2026-08-12",
      issueTime: "11:00:00",
      seller: { name: "Credit Note Co", vatNumber: VAT },
      buyer: { name: "Buyer Co", vatNumber: "300000000000883" },
      billingReferenceId: originalRow.invoiceNumber,
      instructionNote: reason,
      lines: [{ description: "Gadget", quantity: 1, unitPrice: 50 }],
    });
    const note1 = await issueInvoice(companyId, noteInput("Partial return 1"), db);
    const note2 = await issueInvoice(companyId, noteInput("Partial return 2"), db);
    const row1 = await db.invoice.findUniqueOrThrow({ where: { id: note1.invoiceId } });
    const row2 = await db.invoice.findUniqueOrThrow({ where: { id: note2.invoiceId } });
    expect(row1.referencedInvoiceId).toBe(originalRow.id);
    expect(row2.referencedInvoiceId).toBe(originalRow.id);

    const corrections = await db.invoice.findMany({ where: { referencedInvoiceId: originalRow.id } });
    expect(corrections.map((c) => c.id).sort()).toEqual([row1.id, row2.id].sort());
  }, 40_000);

  it("an unresolvable billingReferenceId still issues and still carries the raw string into the XML, but referencedInvoiceId stays null", async () => {
    const note: InvoiceInput = {
      invoiceNumber: "",
      kind: "standard",
      documentType: "credit",
      issueDate: "2026-08-12",
      issueTime: "12:00:00",
      seller: { name: "Credit Note Co", vatNumber: VAT },
      buyer: { name: "Buyer Co", vatNumber: "300000000000883" },
      billingReferenceId: "INV-DOES-NOT-EXIST",
      instructionNote: "Correction for a pre-migration invoice",
      lines: [{ description: "Widget", quantity: 1, unitPrice: 10 }],
    };
    const result = await issueInvoice(companyId, note, db);
    const row = await db.invoice.findUniqueOrThrow({ where: { id: result.invoiceId } });
    expect(row.billingReferenceId).toBe("INV-DOES-NOT-EXIST");
    expect(row.referencedInvoiceId).toBeNull();
    expect(row.signedXml ?? "").toContain("<cbc:ID>INV-DOES-NOT-EXIST</cbc:ID>");
  }, 40_000);
});
