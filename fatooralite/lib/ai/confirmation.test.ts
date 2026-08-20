// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { mintConfirmation, consumeConfirmation } from "./confirmation";

/**
 * Phase 2 / W5: a confirmation token must authorize exactly what was minted
 * — the tool and arguments come back from the server-side row, never from
 * whatever the client resends — and must be usable exactly once.
 */
let db: PrismaClient;
const VAT = "300000000000805";
let companyId: string;
const USER_A = "user-a";
const USER_B = "user-b";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const c = await db.company.create({ data: { name: "Confirm Co", vatNumber: VAT } });
  companyId = c.id;
}, 180_000);

afterAll(async () => {
  if (!db) return;
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("AI confirmation tokens", () => {
  it("mint then consume returns the exact tool and arguments that were minted", async () => {
    const argsJson = JSON.stringify({ invoiceId: "inv-1", amount: 500 });
    const token = await mintConfirmation({ userId: USER_A, companyId, tool: "voidInvoice", argsJson }, db);

    const consumed = await consumeConfirmation({ token, userId: USER_A, companyId }, db);
    expect(consumed).toEqual({ tool: "voidInvoice", argsJson });
  });

  it("a client-supplied different arguments string is never used — only the stored row matters", async () => {
    const storedArgs = JSON.stringify({ invoiceId: "inv-2", amount: 100 });
    const token = await mintConfirmation({ userId: USER_A, companyId, tool: "voidInvoice", argsJson: storedArgs }, db);

    // consumeConfirmation only ever takes {token, userId, companyId} — there
    // is no argument slot for the caller to pass a different payload, which
    // is the whole point. Assert the round trip still returns the original.
    const consumed = await consumeConfirmation({ token, userId: USER_A, companyId }, db);
    expect(consumed?.argsJson).toBe(storedArgs);
    expect(consumed?.argsJson).not.toContain("999999");
  });

  it("refuses a second consume of the same token (replay protection)", async () => {
    const token = await mintConfirmation({ userId: USER_A, companyId, tool: "voidInvoice", argsJson: "{}" }, db);
    const first = await consumeConfirmation({ token, userId: USER_A, companyId }, db);
    expect(first).not.toBeNull();

    const second = await consumeConfirmation({ token, userId: USER_A, companyId }, db);
    expect(second).toBeNull();
  });

  it("refuses an expired token", async () => {
    const token = await mintConfirmation({ userId: USER_A, companyId, tool: "voidInvoice", argsJson: "{}" }, db);
    // Force expiry directly — no clock injection in the API surface, so
    // simulate "5 minutes later" by rewriting the row's expiresAt.
    const hash = await import("node:crypto").then((m) => m.createHash("sha256").update(token).digest("hex"));
    await db.aiConfirmation.update({ where: { tokenHash: hash }, data: { expiresAt: new Date(Date.now() - 1000) } });

    const consumed = await consumeConfirmation({ token, userId: USER_A, companyId }, db);
    expect(consumed).toBeNull();
  });

  it("refuses a token presented by the wrong user", async () => {
    const token = await mintConfirmation({ userId: USER_A, companyId, tool: "voidInvoice", argsJson: "{}" }, db);
    const consumed = await consumeConfirmation({ token, userId: USER_B, companyId }, db);
    expect(consumed).toBeNull();
  });

  it("refuses a token presented for the wrong company", async () => {
    const token = await mintConfirmation({ userId: USER_A, companyId, tool: "voidInvoice", argsJson: "{}" }, db);
    const consumed = await consumeConfirmation({ token, userId: USER_A, companyId: "some-other-company" }, db);
    expect(consumed).toBeNull();
  });

  it("refuses a garbage/forged token", async () => {
    const consumed = await consumeConfirmation({ token: "not-a-real-token", userId: USER_A, companyId }, db);
    expect(consumed).toBeNull();
  });
});
