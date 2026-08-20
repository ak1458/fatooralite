// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { setFlag } from "@/lib/flags/set-flag";

/**
 * Phase 5 / N4. `bulkImport` is Pro-only as declared in
 * lib/billing/entitlements.ts — this is the first real enforcement test for
 * that entitlement (it existed as an honest placeholder with nothing behind
 * it before this phase).
 */
let db: PrismaClient;
let proCompanyId: string;
let trialCompanyId: string;
let otherCompanyId: string;
let proOwnerCookie: string;
let trialOwnerCookie: string;
let otherOwnerCookie: string;
const VAT = "300000000001093";
const TRIAL_VAT = "300000000001103";
const OTHER_VAT = "300000000001113";

const HEADER = "name,nameAr,vatNumber,crNumber,address,city,phone,email";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: { in: [VAT, TRIAL_VAT, OTHER_VAT] } } });

  const pro = await db.company.create({ data: { name: "Import Pro Co", vatNumber: VAT } });
  proCompanyId = pro.id;
  await db.subscription.create({ data: { companyId: proCompanyId, plan: "pro", status: "active" } });
  await setFlag({ companyId: proCompanyId, flag: "csvImport", enabled: true, actor: { email: "test-setup" } }, db);

  const trial = await db.company.create({ data: { name: "Import Trial Co", vatNumber: TRIAL_VAT } });
  trialCompanyId = trial.id;
  await db.subscription.create({
    data: { companyId: trialCompanyId, plan: "trial", status: "active", trialEndsAt: new Date(Date.now() + 5 * 86_400_000) },
  });
  await setFlag({ companyId: trialCompanyId, flag: "csvImport", enabled: true, actor: { email: "test-setup" } }, db);

  const other = await db.company.create({ data: { name: "Import Other Co", vatNumber: OTHER_VAT } });
  otherCompanyId = other.id;
  await db.subscription.create({ data: { companyId: otherCompanyId, plan: "pro", status: "active" } });

  const mint = (companyId: string, email: string) =>
    db.user
      .create({ data: { companyId, email, name: "Owner", role: "owner" } })
      .then((u) => createSessionToken({ userId: u.id, email: u.email, name: u.name, role: u.role, companyId, sessionVersion: u.sessionVersion }))
      .then((t) => `${SESSION_COOKIE}=${t}`);

  proOwnerCookie = await mint(proCompanyId, "import-pro-owner@team.example");
  trialOwnerCookie = await mint(trialCompanyId, "import-trial-owner@team.example");
  otherOwnerCookie = await mint(otherCompanyId, "import-other-owner@team.example");
}, 180_000);

afterAll(async () => {
  if (!db) return;
  await db.user.deleteMany({
    where: { email: { in: ["import-pro-owner@team.example", "import-trial-owner@team.example", "import-other-owner@team.example"] } },
  });
  await db.company.deleteMany({ where: { vatNumber: { in: [VAT, TRIAL_VAT, OTHER_VAT] } } });
  await db.$disconnect();
});

function req(body: unknown, cookie?: string) {
  return new Request("http://localhost/api/import/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!hasTestDb)("POST /api/import/customers (N4)", () => {
  it("401s without a session", async () => {
    const { POST } = await import("./route");
    const res = await POST(req({ companyId: proCompanyId, csv: `${HEADER}\n`, mode: "preview" }));
    expect(res.status).toBe(401);
  });

  it("403s for another company's companyId", async () => {
    const { POST } = await import("./route");
    const res = await POST(req({ companyId: proCompanyId, csv: `${HEADER}\n`, mode: "preview" }, otherOwnerCookie));
    expect(res.status).toBe(403);
  });

  it("402s a trial account — bulkImport is Pro-only", async () => {
    const { POST } = await import("./route");
    const res = await POST(req({ companyId: trialCompanyId, csv: `${HEADER}\n`, mode: "preview" }, trialOwnerCookie));
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.reason).toBe("feature");
    expect(body.feature).toBe("bulkImport");
  });

  it("403s when the csvImport flag is off for this account (Pro, but flag unset)", async () => {
    const { POST } = await import("./route");
    const res = await POST(req({ companyId: otherCompanyId, csv: `${HEADER}\n`, mode: "preview" }, otherOwnerCookie));
    expect(res.status).toBe(403);
  });

  it("400s a file over the byte limit", async () => {
    const { POST } = await import("./route");
    const huge = `${HEADER}\n` + "x".repeat(1_100_000);
    const res = await POST(req({ companyId: proCompanyId, csv: huge, mode: "preview" }, proOwnerCookie));
    expect(res.status).toBe(400);
  });

  it("preview then commit happy path", async () => {
    const { POST } = await import("./route");
    const csv = `${HEADER}\nRoute Test Co,,300000000001123,,,,,route@example.test`;

    const preview = await POST(req({ companyId: proCompanyId, csv, mode: "preview" }, proOwnerCookie));
    expect(preview.status).toBe(200);
    const previewBody = await preview.json();
    expect(previewBody.summary).toEqual({ create: 1, skipDuplicate: 0, error: 0 });

    const commit = await POST(req({ companyId: proCompanyId, csv, mode: "commit" }, proOwnerCookie));
    expect(commit.status).toBe(200);
    const created = await db.customer.findFirst({ where: { companyId: proCompanyId, vatNumber: "300000000001123" } });
    expect(created).not.toBeNull();
  }, 20_000);

  it("commit refuses (422) when a row errors, and inserts nothing", async () => {
    const { POST } = await import("./route");
    const before = await db.customer.count({ where: { companyId: proCompanyId } });
    const csv = `${HEADER}\nValid Row,,,,,,,valid2@example.test\n,,,,,,,`;
    const res = await POST(req({ companyId: proCompanyId, csv, mode: "commit" }, proOwnerCookie));
    expect(res.status).toBe(422);
    expect(await db.customer.count({ where: { companyId: proCompanyId } })).toBe(before);
  });
});
