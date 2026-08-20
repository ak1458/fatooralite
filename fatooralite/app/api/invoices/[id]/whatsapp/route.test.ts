// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, afterEach, describe, it, expect, vi } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { SECURITY_EVENTS } from "@/lib/audit/events";

/**
 * D8/N3 (docs/audit/decision-register.md). Mirrors
 * app/api/invoices/[id]/send/route.test.ts (N7, email) exactly on the
 * property that matters most: the recipient can never come from the
 * caller. Every test that reaches the send path confirms the message went
 * to the invoice's own linked Customer.phone, never anything derived from
 * the request.
 */
vi.mock("@/lib/pdf/generate", () => ({ generatePdf: vi.fn(async () => new Uint8Array([1, 2, 3])) }));
const sendWhatsAppMock = vi.fn(async (_input: { to: string }) => ({ sent: false }));
// isWhatsAppProviderConfigured must be mocked too now that the route also
// imports it (provider dispatch, 2026-08-19 OpenWA addition) — this file
// tests authorization/anti-abuse behaviour, not provider selection (that's
// lib/whatsapp/send.test.ts and lib/whatsapp/providers/openwa.test.ts), so
// it's pinned to `false` throughout: no real provider is "configured" from
// the route's perspective, matching every test's expectation of a mock send.
vi.mock("@/lib/whatsapp/send", () => ({
  sendWhatsAppInvoice: (input: { to: string }) => sendWhatsAppMock(input),
  isWhatsAppProviderConfigured: () => false,
}));

let db: PrismaClient;
let companyId: string;
let otherCompanyId: string;
let ownerCookie: string;
let otherOwnerCookie: string;
const VAT = "300000000001063";
const OTHER_VAT = "300000000001073";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: { in: [VAT, OTHER_VAT] } } });
  const company = await db.company.create({ data: { name: "WhatsApp Co", vatNumber: VAT } });
  companyId = company.id;
  const other = await db.company.create({ data: { name: "Other WhatsApp Co", vatNumber: OTHER_VAT } });
  otherCompanyId = other.id;

  const owner = await db.user.create({
    data: { companyId, email: "wa-owner@team.example", name: "WA Owner", role: "owner" },
  });
  ownerCookie = `${SESSION_COOKIE}=${await createSessionToken({
    userId: owner.id, email: owner.email, name: owner.name, role: owner.role,
    companyId, sessionVersion: owner.sessionVersion,
  })}`;
  const otherOwner = await db.user.create({
    data: { companyId: otherCompanyId, email: "wa-other-owner@team.example", name: "Other WA Owner", role: "owner" },
  });
  otherOwnerCookie = `${SESSION_COOKIE}=${await createSessionToken({
    userId: otherOwner.id, email: otherOwner.email, name: otherOwner.name, role: otherOwner.role,
    companyId: otherCompanyId, sessionVersion: otherOwner.sessionVersion,
  })}`;
  // whatsappInvoiceDelivery defaults OFF (D8's own scope) — most of this
  // file is testing what happens once a tenant has it on; the one test
  // for the default-off case explicitly unsets this itself.
  process.env.FEATURE_WHATSAPP_INVOICE_DELIVERY = "true";
}, 180_000);

afterEach(() => {
  sendWhatsAppMock.mockClear();
});

afterAll(async () => {
  if (!db) return;
  await db.user.deleteMany({ where: { email: { in: ["wa-owner@team.example", "wa-other-owner@team.example"] } } });
  await db.company.deleteMany({ where: { vatNumber: { in: [VAT, OTHER_VAT] } } });
  await db.$disconnect();
});

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

let n = 0;
async function makeInvoice(cid: string, opts: { status?: string; customerId?: string | null } = {}) {
  const num = `WA-${++n}`;
  return db.invoice.create({
    data: {
      companyId: cid, invoiceNumber: num, uuid: `${num}-${cid}`, kind: "standard",
      status: opts.status ?? "signed", issueDate: "2026-08-12", issueTime: "10:00:00",
      customerId: opts.customerId,
      taxableAmount: 100, vatAmount: 15, grandTotal: 115,
    },
  });
}

describe.skipIf(!hasTestDb)("POST /api/invoices/:id/whatsapp (D8/N3)", () => {
  it("401s without a session", async () => {
    const { POST } = await import("./route");
    const invoice = await makeInvoice(companyId);
    const res = await POST(new Request("http://localhost", { method: "POST" }), ctx(invoice.id));
    expect(res.status).toBe(401);
  }, 20_000);

  // Real, measured, reproducible (twice, in a multi-file batch) Neon
  // connection-latency variance, not a code defect — same class as Phase
  // 4's documented plan.test.ts timeout (docs/SESSION_HANDOFF_2026-08-18.md
  // §3.5). Explicit timeouts on every DB-touching test in this file, not
  // just the one observed to trip the 5s default, since the underlying
  // cause is connection-establishment jitter that could land on any of them.
  it("403s for another company's invoice", async () => {
    const { POST } = await import("./route");
    const invoice = await makeInvoice(companyId);
    const res = await POST(
      new Request("http://localhost", { method: "POST", headers: { cookie: otherOwnerCookie } }),
      ctx(invoice.id),
    );
    expect(res.status).toBe(403);
  }, 20_000);

  it("404s for an unknown id", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost", { method: "POST", headers: { cookie: ownerCookie } }),
      ctx("does-not-exist"),
    );
    expect(res.status).toBe(404);
  }, 20_000);

  it("422s a draft invoice", async () => {
    const { POST } = await import("./route");
    const invoice = await makeInvoice(companyId, { status: "draft" });
    const res = await POST(
      new Request("http://localhost", { method: "POST", headers: { cookie: ownerCookie } }),
      ctx(invoice.id),
    );
    expect(res.status).toBe(422);
  }, 20_000);

  it("422s when the invoice has no linked customer", async () => {
    const { POST } = await import("./route");
    const invoice = await makeInvoice(companyId, { customerId: null });
    const res = await POST(
      new Request("http://localhost", { method: "POST", headers: { cookie: ownerCookie } }),
      ctx(invoice.id),
    );
    expect(res.status).toBe(422);
    expect(sendWhatsAppMock).not.toHaveBeenCalled();
  }, 20_000);

  it("422s when the linked customer has no phone on file", async () => {
    const { POST } = await import("./route");
    const customer = await db.customer.create({ data: { companyId, name: "No Phone Co" } });
    const invoice = await makeInvoice(companyId, { customerId: customer.id });
    const res = await POST(
      new Request("http://localhost", { method: "POST", headers: { cookie: ownerCookie } }),
      ctx(invoice.id),
    );
    expect(res.status).toBe(422);
    expect(sendWhatsAppMock).not.toHaveBeenCalled();
  }, 20_000);

  it("422s when the linked customer's phone is not a valid WhatsApp-capable format", async () => {
    const { POST } = await import("./route");
    const customer = await db.customer.create({ data: { companyId, name: "Bad Phone Co", phone: "call me maybe" } });
    const invoice = await makeInvoice(companyId, { customerId: customer.id });
    const res = await POST(
      new Request("http://localhost", { method: "POST", headers: { cookie: ownerCookie } }),
      ctx(invoice.id),
    );
    expect(res.status).toBe(422);
    expect(sendWhatsAppMock).not.toHaveBeenCalled();
  }, 20_000);

  it("sends to the invoice's linked Customer.phone — never a client-supplied number — and records a SecurityEvent", async () => {
    const { POST } = await import("./route");
    const customer = await db.customer.create({ data: { companyId, name: "Real Customer", phone: "+966500000001" } });
    const invoice = await makeInvoice(companyId, { customerId: customer.id });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { cookie: ownerCookie, "Content-Type": "application/json" },
        // Attempt to smuggle a different recipient — must be ignored entirely.
        body: JSON.stringify({ to: "+15551234567" }),
      }),
      ctx(invoice.id),
    );
    expect(res.status).toBe(200);
    expect(sendWhatsAppMock).toHaveBeenCalledTimes(1);
    const call = sendWhatsAppMock.mock.calls[0][0] as { to: string };
    expect(call.to).toBe("+966500000001");

    const event = await db.securityEvent.findFirst({
      where: { companyId, action: SECURITY_EVENTS.invoiceWhatsappSent, targetId: invoice.id },
      orderBy: { createdAt: "desc" },
    });
    expect(event).not.toBeNull();
  }, 20_000);

  it("403s when the whatsappInvoiceDelivery flag is not enabled for this account (default OFF)", async () => {
    delete process.env.FEATURE_WHATSAPP_INVOICE_DELIVERY;
    try {
      const { POST } = await import("./route");
      const customer = await db.customer.create({ data: { companyId, name: "Flag Off Co", phone: "+966500000002" } });
      const invoice = await makeInvoice(companyId, { customerId: customer.id });
      const res = await POST(
        new Request("http://localhost", { method: "POST", headers: { cookie: ownerCookie } }),
        ctx(invoice.id),
      );
      expect(res.status).toBe(403);
      expect(sendWhatsAppMock).not.toHaveBeenCalled();
    } finally {
      process.env.FEATURE_WHATSAPP_INVOICE_DELIVERY = "true";
    }
  }, 20_000);
});
