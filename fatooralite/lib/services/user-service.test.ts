import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { inviteUser, UserError } from "./user-service";

let db: PrismaClient;
const COMPANY_VAT = "300000000000052";

async function clean(c: PrismaClient) {
  await c.user.deleteMany({ where: { email: { endsWith: "@team.example" } } });
  const co = await c.company.findUnique({ where: { vatNumber: COMPANY_VAT } });
  if (co) await c.company.delete({ where: { id: co.id } });
}

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await clean(db);
  await db.company.create({ data: { name: "Team Co", vatNumber: COMPANY_VAT } });
}, 120_000);

afterAll(async () => {
  if (db) { await clean(db); await db.$disconnect(); }
});

async function companyId() {
  return (await db.company.findUnique({ where: { vatNumber: COMPANY_VAT } }))!.id;
}

describe.skipIf(!hasTestDb)("inviteUser", () => {
  it("creates an active user with role, title, and a hashed password", async () => {
    const user = await inviteUser(
      { companyId: await companyId(), email: "sara@team.example", name: "Sara", role: "accountant", title: "Chief Accountant", password: "passw0rd" },
      db,
    );
    expect(user.role).toBe("accountant");
    expect(user.title).toBe("Chief Accountant");
    expect(user.status).toBe("active");
    expect(user.passwordHash).toBeTruthy();
    expect(user.passwordHash).not.toBe("passw0rd");
  });

  it("marks a user without a password as invited", async () => {
    const user = await inviteUser(
      { companyId: await companyId(), email: "invited@team.example", name: "Pending", role: "auditor" },
      db,
    );
    expect(user.status).toBe("invited");
  });

  it("rejects a duplicate email", async () => {
    const cid = await companyId();
    await inviteUser({ companyId: cid, email: "dup@team.example", name: "A", role: "employee" }, db);
    await expect(
      inviteUser({ companyId: cid, email: "dup@team.example", name: "B", role: "employee" }, db),
    ).rejects.toThrow(UserError);
  });

  it("rejects an unknown role", async () => {
    await expect(
      inviteUser({ companyId: await companyId(), email: "bad@team.example", name: "X", role: "wizard" }, db),
    ).rejects.toThrow(/role/i);
  });
});
