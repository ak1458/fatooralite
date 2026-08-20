// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { setFlag } from "./set-flag";
import { SECURITY_EVENTS } from "@/lib/audit/events";

let db: PrismaClient;
let companyId: string;
const VAT = "300000000001023";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const company = await db.company.create({ data: { name: "Set Flag Co", vatNumber: VAT } });
  companyId = company.id;
}, 120_000);

afterAll(async () => {
  if (!db) return;
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("setFlag (N6)", () => {
  it("upserts a row and records a SecurityEvent", async () => {
    await setFlag({ companyId, flag: "csvImport", enabled: true, actor: { email: "op@team.example" } }, db);
    const row = await db.featureFlag.findUnique({ where: { companyId_flag: { companyId, flag: "csvImport" } } });
    expect(row?.enabled).toBe(true);

    const event = await db.securityEvent.findFirst({
      where: { companyId, action: SECURITY_EVENTS.featureFlagChanged },
      orderBy: { createdAt: "desc" },
    });
    expect(event?.actorEmail).toBe("op@team.example");
  });

  it("upserting again updates the same row rather than duplicating it", async () => {
    await setFlag({ companyId, flag: "csvImport", enabled: false, actor: { email: "op@team.example" } }, db);
    const rows = await db.featureFlag.findMany({ where: { companyId, flag: "csvImport" } });
    expect(rows).toHaveLength(1);
    expect(rows[0].enabled).toBe(false);
  });

  it("enabled:null clears the row entirely", async () => {
    await setFlag({ companyId, flag: "csvImport", enabled: null, actor: { email: "op@team.example" } }, db);
    const row = await db.featureFlag.findUnique({ where: { companyId_flag: { companyId, flag: "csvImport" } } });
    expect(row).toBeNull();
  });
});
