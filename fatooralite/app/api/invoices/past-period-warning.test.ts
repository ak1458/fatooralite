// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { generateKeyPair } from "@/lib/zatca/index";
import { riyadhToday } from "@/lib/time/riyadh";

/**
 * D2 (docs/audit/decision-register.md) — Option B: a soft, non-blocking
 * warning when an invoice is dated into an already-elapsed reporting period.
 * There is no period lock (Option C, not chosen) — issuance must still
 * succeed either way; this only proves the warning appears/doesn't appear.
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
  const company = await db.company.create({ data: { name: "Period Warning Co", vatNumber: VAT } });
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

  const owner = await db.user.create({
    data: { companyId, email: "period-warning-owner@team.example", name: "Period Warning Owner", role: "owner" },
  });
  ownerCookie = `${SESSION_COOKIE}=${await createSessionToken({
    userId: owner.id, email: owner.email, name: owner.name, role: owner.role,
    companyId, sessionVersion: owner.sessionVersion,
  })}`;
}, 180_000);

afterAll(async () => {
  if (!db) return;
  await db.user.deleteMany({ where: { email: "period-warning-owner@team.example" } });
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

const issue = (issueDate: string, invoiceNumber: string) =>
  fetchPost({
    companyId,
    input: {
      invoiceNumber,
      kind: "standard" as const,
      issueDate,
      buyer: { name: "Walk-in", vatNumber: "300000000000003" },
      lines: [{ description: `Item ${invoiceNumber}`, quantity: 1, unitPrice: 100 }],
    },
  });

async function fetchPost(body: unknown) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/invoices", {
      method: "POST",
      headers: { cookie: ownerCookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe.skipIf(!hasTestDb)("past-reporting-period soft warning (D2)", () => {
  it("does not warn when the invoice is dated in the current month", async () => {
    const res = await issue(riyadhToday(), "CURR-1");
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.warnings).toBeUndefined();
  }, 20_000);

  it("warns, but still issues (201), when dated into an already-elapsed month", async () => {
    const res = await issue("2020-01-15", "PAST-1");
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.warnings).toEqual([expect.stringContaining("2020-01-15")]);
    // Never blocking — the invoice really was created.
    const row = await db.invoice.findUnique({ where: { id: body.invoiceId } });
    expect(row).not.toBeNull();
    expect(row?.status).toBe("signed");
  }, 20_000);
});
