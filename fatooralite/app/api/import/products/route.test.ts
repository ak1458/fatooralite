// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { setFlag } from "@/lib/flags/set-flag";

let db: PrismaClient;
let companyId: string;
let ownerCookie: string;
const VAT = "300000000001153";
const HEADER = "name,sku,unitPrice,vatCategory";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const company = await db.company.create({ data: { name: "Import Products Co", vatNumber: VAT } });
  companyId = company.id;
  await db.subscription.create({ data: { companyId, plan: "pro", status: "active" } });
  await setFlag({ companyId, flag: "csvImport", enabled: true, actor: { email: "test-setup" } }, db);
  const owner = await db.user.create({ data: { companyId, email: "import-products-owner@team.example", name: "Owner", role: "owner" } });
  ownerCookie = `${SESSION_COOKIE}=${await createSessionToken({
    userId: owner.id, email: owner.email, name: owner.name, role: owner.role, companyId, sessionVersion: owner.sessionVersion,
  })}`;
}, 120_000);

afterAll(async () => {
  if (!db) return;
  await db.user.deleteMany({ where: { email: "import-products-owner@team.example" } });
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("POST /api/import/products (N4 smoke)", () => {
  it("preview then commit happy path", async () => {
    const { POST } = await import("./route");
    const csv = `${HEADER}\nWidget,WID-ROUTE-1,12.50,S`;
    const req = (mode: string) =>
      new Request("http://localhost/api/import/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: ownerCookie },
        body: JSON.stringify({ companyId, csv, mode }),
      });

    const preview = await POST(req("preview"));
    expect(preview.status).toBe(200);
    expect((await preview.json()).summary).toEqual({ create: 1, skipDuplicate: 0, error: 0 });

    const commit = await POST(req("commit"));
    expect(commit.status).toBe(200);
    const created = await db.product.findFirst({ where: { companyId, sku: "WID-ROUTE-1" } });
    expect(created).not.toBeNull();
  }, 20_000);
});
