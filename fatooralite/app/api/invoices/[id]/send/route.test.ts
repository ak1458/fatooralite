// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, afterEach, describe, it, expect, vi } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { SECURITY_EVENTS } from "@/lib/audit/events";

/**
 * Phase 5 / N7. The one property that actually matters here: the recipient
 * can never come from the caller. Every test that reaches the send path
 * confirms the email went to the invoice's own linked Customer.email, never
 * anything derived from the request.
 */
vi.mock("@/lib/pdf/generate", () => ({ generatePdf: vi.fn(async () => new Uint8Array([1, 2, 3])) }));
const sendEmailMock = vi.fn(async (_input: { to: string; subject: string; html: string; attachments?: unknown }) => ({ sent: false }));
vi.mock("@/lib/email/send", () => ({ sendEmail: (input: { to: string; subject: string; html: string; attachments?: unknown }) => sendEmailMock(input) }));

let db: PrismaClient;
let companyId: string;
let otherCompanyId: string;
let ownerCookie: string;
let otherOwnerCookie: string;
const VAT = "300000000001043";
const OTHER_VAT = "300000000001053";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: { in: [VAT, OTHER_VAT] } } });
  const company = await db.company.create({ data: { name: "Send Co", vatNumber: VAT } });
  companyId = company.id;
  const other = await db.company.create({ data: { name: "Other Send Co", vatNumber: OTHER_VAT } });
  otherCompanyId = other.id;

  const owner = await db.user.create({
    data: { companyId, email: "send-owner@team.example", name: "Send Owner", role: "owner" },
  });
  ownerCookie = `${SESSION_COOKIE}=${await createSessionToken({
    userId: owner.id, email: owner.email, name: owner.name, role: owner.role,
    companyId, sessionVersion: owner.sessionVersion,
  })}`;
  const otherOwner = await db.user.create({
    data: { companyId: otherCompanyId, email: "send-other-owner@team.example", name: "Other Owner", role: "owner" },
  });
  otherOwnerCookie = `${SESSION_COOKIE}=${await createSessionToken({
    userId: otherOwner.id, email: otherOwner.email, name: otherOwner.name, role: otherOwner.role,
    companyId: otherCompanyId, sessionVersion: otherOwner.sessionVersion,
  })}`;
}, 180_000);

afterEach(() => {
  sendEmailMock.mockClear();
});

afterAll(async () => {
  if (!db) return;
  await db.user.deleteMany({ where: { email: { in: ["send-owner@team.example", "send-other-owner@team.example"] } } });
  await db.company.deleteMany({ where: { vatNumber: { in: [VAT, OTHER_VAT] } } });
  await db.$disconnect();
});

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

let n = 0;
async function makeInvoice(cid: string, opts: { status?: string; customerId?: string | null } = {}) {
  const num = `SEND-${++n}`;
  return db.invoice.create({
    data: {
      companyId: cid, invoiceNumber: num, uuid: `${num}-${cid}`, kind: "standard",
      status: opts.status ?? "signed", issueDate: "2026-08-12", issueTime: "10:00:00",
      customerId: opts.customerId,
      taxableAmount: 100, vatAmount: 15, grandTotal: 115,
    },
  });
}

describe.skipIf(!hasTestDb)("POST /api/invoices/:id/send (N7)", () => {
  it("401s without a session", async () => {
    const { POST } = await import("./route");
    const invoice = await makeInvoice(companyId);
    const res = await POST(new Request("http://localhost", { method: "POST" }), ctx(invoice.id));
    expect(res.status).toBe(401);
  });

  it("403s for another company's invoice", async () => {
    const { POST } = await import("./route");
    const invoice = await makeInvoice(companyId);
    const res = await POST(
      new Request("http://localhost", { method: "POST", headers: { cookie: otherOwnerCookie } }),
      ctx(invoice.id),
    );
    expect(res.status).toBe(403);
  });

  it("404s for an unknown id", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost", { method: "POST", headers: { cookie: ownerCookie } }),
      ctx("does-not-exist"),
    );
    expect(res.status).toBe(404);
  });

  it("422s a draft invoice", async () => {
    const { POST } = await import("./route");
    const invoice = await makeInvoice(companyId, { status: "draft" });
    const res = await POST(
      new Request("http://localhost", { method: "POST", headers: { cookie: ownerCookie } }),
      ctx(invoice.id),
    );
    expect(res.status).toBe(422);
  });

  it("422s when the invoice has no linked customer", async () => {
    const { POST } = await import("./route");
    const invoice = await makeInvoice(companyId, { customerId: null });
    const res = await POST(
      new Request("http://localhost", { method: "POST", headers: { cookie: ownerCookie } }),
      ctx(invoice.id),
    );
    expect(res.status).toBe(422);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("422s when the linked customer has no email on file", async () => {
    const { POST } = await import("./route");
    const customer = await db.customer.create({ data: { companyId, name: "No Email Co" } });
    const invoice = await makeInvoice(companyId, { customerId: customer.id });
    const res = await POST(
      new Request("http://localhost", { method: "POST", headers: { cookie: ownerCookie } }),
      ctx(invoice.id),
    );
    expect(res.status).toBe(422);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sends to the invoice's linked Customer.email — never a client-supplied address — and records a SecurityEvent", async () => {
    const { POST } = await import("./route");
    const customer = await db.customer.create({ data: { companyId, name: "Real Customer", email: "buyer@example.test" } });
    const invoice = await makeInvoice(companyId, { customerId: customer.id });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { cookie: ownerCookie, "Content-Type": "application/json" },
        // Attempt to smuggle a different recipient — must be ignored entirely.
        body: JSON.stringify({ to: "attacker@evil.example" }),
      }),
      ctx(invoice.id),
    );
    expect(res.status).toBe(200);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const call = sendEmailMock.mock.calls[0][0] as { to: string };
    expect(call.to).toBe("buyer@example.test");

    const event = await db.securityEvent.findFirst({
      where: { companyId, action: SECURITY_EVENTS.invoiceEmailSent, targetId: invoice.id },
      orderBy: { createdAt: "desc" },
    });
    expect(event).not.toBeNull();
  }, 20_000);

  it("403s when the emailInvoiceDelivery flag is forced off for this account", async () => {
    process.env.FEATURE_EMAIL_INVOICE_DELIVERY = "false";
    try {
      const { POST } = await import("./route");
      const customer = await db.customer.create({ data: { companyId, name: "Flag Off Co", email: "x@example.test" } });
      const invoice = await makeInvoice(companyId, { customerId: customer.id });
      const res = await POST(
        new Request("http://localhost", { method: "POST", headers: { cookie: ownerCookie } }),
        ctx(invoice.id),
      );
      expect(res.status).toBe(403);
      expect(sendEmailMock).not.toHaveBeenCalled();
    } finally {
      delete process.env.FEATURE_EMAIL_INVOICE_DELIVERY;
    }
  });
});
