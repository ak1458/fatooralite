// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { generateKeyPair } from "@/lib/zatca/index";

/**
 * Phase 3 / W15 — the clearance route was previously untested at the route
 * level despite encoding two START-HERE invariants: clearance is never
 * plan-gated (an expired trial can still clear an already-issued invoice —
 * gating it would turn a billing state into a regulatory violation), and
 * ordinary tenant-isolation (a company can't clear another company's
 * invoice, can't be found from outside its own tenant).
 */
let db: PrismaClient;
let companyId: string;
let otherCompanyId: string;
let ownerCookie: string;
let otherOwnerCookie: string;
const VAT = "300000000000853";
const OTHER_VAT = "300000000000863";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: { in: [VAT, OTHER_VAT] } } });

  // Deliberately NO Subscription row — resolves to "expired" (invariant).
  const company = await db.company.create({ data: { name: "Clear Co", vatNumber: VAT } });
  companyId = company.id;
  const other = await db.company.create({ data: { name: "Other Clear Co", vatNumber: OTHER_VAT } });
  otherCompanyId = other.id;

  const kp = generateKeyPair();
  await db.certificate.create({
    data: {
      companyId, kind: "production", status: "active",
      privateKey: kp.privateKeyPem, publicKey: kp.publicKeyPem,
      token: "test-token", secret: "test-secret",
    },
  });

  const owner = await db.user.create({
    data: { companyId, email: "clear-owner@team.example", name: "Clear Owner", role: "owner" },
  });
  ownerCookie = `${SESSION_COOKIE}=${await createSessionToken({
    userId: owner.id, email: owner.email, name: owner.name, role: owner.role,
    companyId, sessionVersion: owner.sessionVersion,
  })}`;
  const otherOwner = await db.user.create({
    data: { companyId: otherCompanyId, email: "clear-other-owner@team.example", name: "Other Owner", role: "owner" },
  });
  otherOwnerCookie = `${SESSION_COOKIE}=${await createSessionToken({
    userId: otherOwner.id, email: otherOwner.email, name: otherOwner.name, role: otherOwner.role,
    companyId: otherCompanyId, sessionVersion: otherOwner.sessionVersion,
  })}`;
}, 180_000);

afterAll(async () => {
  if (!db) return;
  await db.user.deleteMany({ where: { email: { in: ["clear-owner@team.example", "clear-other-owner@team.example"] } } });
  await db.company.deleteMany({ where: { vatNumber: { in: [VAT, OTHER_VAT] } } });
  await db.$disconnect();
});

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

let n = 0;
async function makeSignedInvoice(cid: string) {
  const num = `CLR-${++n}`;
  return db.invoice.create({
    data: {
      companyId: cid, invoiceNumber: num, uuid: `${num}-${cid}`, kind: "standard",
      status: "signed", issueDate: "2026-08-12", issueTime: "10:00:00",
      signedXml: "<Invoice/>", hash: `hash-${num}`,
      taxableAmount: 100, vatAmount: 15, grandTotal: 115,
    },
  });
}

describe.skipIf(!hasTestDb)("POST /api/invoices/:id/clear (W15)", () => {
  it("clears a signed invoice for an EXPIRED-plan tenant — clearance is never plan-gated (invariant)", async () => {
    const inv = await makeSignedInvoice(companyId);
    // This company has no Subscription row at all -> resolves to "expired".
    const { POST } = await import("./route");
    const res = await POST(
      new Request(`http://localhost/api/invoices/${inv.id}/clear`, { method: "POST", headers: { cookie: ownerCookie } }),
      ctx(inv.id),
    );
    // Real ZATCA_MODE=simulation/sandbox default may reject/error depending
    // on env — the invariant under test is that plan status never produces
    // a 402, whatever the gateway itself says.
    expect(res.status).not.toBe(402);
  }, 40_000);

  it("refuses to clear another tenant's invoice (404, not a cross-tenant leak)", async () => {
    const inv = await makeSignedInvoice(companyId);
    const { POST } = await import("./route");
    const res = await POST(
      new Request(`http://localhost/api/invoices/${inv.id}/clear`, { method: "POST", headers: { cookie: otherOwnerCookie } }),
      ctx(inv.id),
    );
    expect([403, 404]).toContain(res.status);
  });

  it("404s for a nonexistent invoice id", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/invoices/does-not-exist/clear", { method: "POST", headers: { cookie: ownerCookie } }),
      ctx("does-not-exist"),
    );
    expect(res.status).toBe(404);
  });

  it("401s an unauthenticated request", async () => {
    const inv = await makeSignedInvoice(companyId);
    const { POST } = await import("./route");
    const res = await POST(new Request(`http://localhost/api/invoices/${inv.id}/clear`, { method: "POST" }), ctx(inv.id));
    expect(res.status).toBe(401);
  });

  it("409s a second clear attempt on an invoice already cleared (AlreadySubmittedError)", async () => {
    // Stub the gateway to accept, mirroring the real submit-then-resubmit shape
    // via the service directly, then hit the route a second time — the route
    // uses the real client when no submitter is injected, so drive this
    // through the service layer for the first clear and the route for the
    // second, asserting the route's own error mapping.
    const { submitInvoice } = await import("@/lib/services/clearance-service");
    const inv = await makeSignedInvoice(companyId);
    await submitInvoice(inv.id, {
      actionFor: () => "clearance",
      async submit() {
        return { action: "clearance" as const, status: "accepted" as const, code: "CLEARED", message: "ok", raw: "{}" };
      },
    }, db);

    const { POST } = await import("./route");
    const res = await POST(
      new Request(`http://localhost/api/invoices/${inv.id}/clear`, { method: "POST", headers: { cookie: ownerCookie } }),
      ctx(inv.id),
    );
    expect(res.status).toBe(409);
  }, 20_000);
});
