// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { generateKeyPair } from "@/lib/zatca/index";

/**
 * Phase 3 / W12: an invoice failing BR-KSA validation must be refused before
 * it burns a chain slot (ICV) or an invoice number — not just rejected later
 * at ZATCA submit time, by which point it's already signed into the chain.
 */
let db: PrismaClient;
let companyId: string;
let ownerCookie: string;
// ZATCA VAT format: /^3\d{13}3$/ — must both start AND end with 3.
const VAT = "300000000000833";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const company = await db.company.create({ data: { name: "Validation Co", vatNumber: VAT } });
  companyId = company.id;
  // A missing Subscription resolves to "expired" (invariant) and expired
  // tenants can't issue invoices — this test is about validation, not
  // billing, so give it an active plan.
  await db.subscription.create({ data: { companyId, plan: "pro", status: "active" } });

  const kp = generateKeyPair();
  await db.certificate.create({
    data: {
      companyId, kind: "production", status: "active",
      privateKey: kp.privateKeyPem, publicKey: kp.publicKeyPem,
      token: "test-token", secret: "test-secret",
    },
  });

  const owner = await db.user.create({
    data: { companyId, email: "validation-owner@team.example", name: "Validation Owner", role: "owner" },
  });
  ownerCookie = `${SESSION_COOKIE}=${await createSessionToken({
    userId: owner.id, email: owner.email, name: owner.name, role: owner.role,
    companyId, sessionVersion: owner.sessionVersion,
  })}`;
}, 180_000);

afterAll(async () => {
  if (!db) return;
  await db.user.deleteMany({ where: { email: "validation-owner@team.example" } });
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("invoice validation at issue time (W12)", () => {
  it("refuses a standard invoice with no buyer VAT before signing (BR-KSA-44), and never advances the chain counter", async () => {
    const before = await db.invoiceCounter.findUnique({ where: { companyId } }).catch(() => null);

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { cookie: ownerCookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          input: {
            kind: "standard", issueDate: "2026-08-12",
            buyer: { name: "Walk-in" }, // missing vatNumber — BR-KSA-44
            lines: [{ description: "Item", quantity: 1, unitPrice: 100 }],
          },
        }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "BR-KSA-44" })]));

    const after = await db.invoiceCounter.findUnique({ where: { companyId } }).catch(() => null);
    // The chain slot must not have advanced — invalid input never reaches nextChainSlot.
    expect(after?.next ?? 0).toBe(before?.next ?? 0);

    const invoiceCount = await db.invoice.count({ where: { companyId } });
    expect(invoiceCount).toBe(0); // no draft row left behind either
  }, 20_000);

  // Negative quantity/price are ALSO rejected by createInvoiceSchema's own
  // zod bounds (quantity.positive(), unitPrice.min(0)) before this ever
  // runs — that's zod's job, not this gate's. What zod does NOT check is
  // BR-KSA-27 (a zero-rated/exempt line needs an exemption reason) — no
  // cross-field rule in the zod schema — which is exactly the class of rule
  // this gate exists to catch before a chain slot is burned.
  it("refuses a zero-rated line with no exemption reason (BR-KSA-27) — a rule zod itself doesn't check", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { cookie: ownerCookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          input: {
            kind: "simplified", issueDate: "2026-08-12",
            lines: [{ description: "Item", quantity: 1, unitPrice: 100, taxCategory: "Z" }],
          },
        }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "BR-KSA-27" })]));
  });

  it("service-level validation catches what the route's zod schema alone would miss — issueInvoice() called directly, bypassing zod", async () => {
    const { issueInvoice, InvoiceValidationError } = await import("@/lib/services/invoice-service");
    await expect(
      issueInvoice(companyId, {
        invoiceNumber: "",
        kind: "standard",
        issueDate: "2026-08-12",
        seller: { name: "Validation Co", vatNumber: VAT },
        // No buyer VAT on a standard invoice — BR-KSA-44. A caller that
        // builds InvoiceInput directly (lib/ai/tools.ts, onboarding
        // compliance checks) never passes through the route's zod schema.
        buyer: { name: "Walk-in" },
        lines: [{ description: "Item", quantity: 1, unitPrice: 100 }],
      } as never, db),
    ).rejects.toBeInstanceOf(InvoiceValidationError);
  });

  it("a valid invoice is unaffected — still issues normally", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { cookie: ownerCookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          input: {
            kind: "simplified", issueDate: "2026-08-12",
            lines: [{ description: "Item", quantity: 1, unitPrice: 100 }],
          },
        }),
      }),
    );
    expect(res.status).toBe(201);
  }, 20_000);
});
