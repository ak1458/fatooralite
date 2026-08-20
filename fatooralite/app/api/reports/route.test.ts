// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

/**
 * A VAT return is decided by each invoice's *issue date* — the tax point — and
 * must not depend on when the row was written or on the server's timezone.
 *
 * This route filtered on `createdAt` against month boundaries built with
 * `new Date(year, month, 1)` (midnight in the server's local zone). An invoice
 * issued 15 July but entered on 10 August was declared in August and missing
 * from July, and an invoice near a month boundary landed in a different period
 * depending on where the server ran.
 */
let db: PrismaClient;
let companyId: string;
let cookie: string;
const VAT = "300000000000903";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const company = await db.company.create({ data: { name: "Period Co", vatNumber: VAT } });
  companyId = company.id;
  const user = await db.user.create({
    data: { companyId, email: "period-probe@team.example", name: "Period Probe", role: "owner" },
  });
  cookie = `${SESSION_COOKIE}=${await createSessionToken({
    userId: user.id, email: user.email, name: user.name, role: user.role,
    companyId, sessionVersion: user.sessionVersion,
  })}`;

  const mk = (invoiceNumber: string, issueDate: string, createdAt: Date) =>
    db.invoice.create({
      data: {
        companyId, invoiceNumber, uuid: `${invoiceNumber}-${companyId}`, kind: "standard",
        status: "cleared", issueDate, issueTime: "10:00:00",
        taxableAmount: 1000, vatAmount: 150, grandTotal: 1150, createdAt,
      },
    });

  // Issued in July, entered in August — a late entry or a correction.
  await mk("P-JULY", "2026-07-15", new Date("2026-08-10T09:00:00Z"));
  // Issued and entered in August.
  await mk("P-AUG", "2026-08-10", new Date("2026-08-10T09:00:00Z"));
  // Issued on the last day of July, written to the database at 21:30 UTC —
  // which is already August in some server timezones and still July in others.
  await mk("P-EDGE", "2026-07-31", new Date("2026-07-31T21:30:00Z"));
}, 180_000);

afterAll(async () => {
  if (!db) return;
  await db.user.deleteMany({ where: { email: "period-probe@team.example" } });
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

async function report(month: string) {
  const { GET } = await import("./route");
  const res = await GET(
    new Request(`http://localhost/api/reports?companyId=${companyId}&month=${month}`, { headers: { cookie } }),
  );
  return res.json() as Promise<{ totalTaxable: number; totalVat: number; totalInvoices: number; period: string }>;
}

describe.skipIf(!hasTestDb)("GET /api/reports — VAT period boundaries", () => {
  it("places an invoice in the period it was ISSUED in, not entered in", async () => {
    const july = await report("2026-07");
    expect(july.totalInvoices).toBe(2); // P-JULY + P-EDGE
    expect(july.totalTaxable).toBe(2000);
    expect(july.totalVat).toBe(300);
  });

  it("does not leak a July invoice into August", async () => {
    const august = await report("2026-08");
    expect(august.totalInvoices).toBe(1); // P-AUG only
    expect(august.totalTaxable).toBe(1000);
    expect(august.totalVat).toBe(150);
  });

  it("puts a month-end invoice in the same period regardless of server timezone", async () => {
    const original = process.env.TZ;
    try {
      // Riyadh is UTC+3; a naive local-midnight boundary moves under it.
      process.env.TZ = "Asia/Riyadh";
      const riyadh = await report("2026-07");
      process.env.TZ = "UTC";
      const utc = await report("2026-07");
      expect(riyadh.totalInvoices).toBe(utc.totalInvoices);
      expect(riyadh.totalTaxable).toBe(utc.totalTaxable);
      expect(utc.totalInvoices).toBe(2);
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it("rolls a December period into the following January", async () => {
    const dec = await report("2026-12");
    expect(dec.period).toBe("December 2026");
    expect(dec.totalInvoices).toBe(0);
  });
});
