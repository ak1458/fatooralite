/**
 * Restore verification (Phase 4 / W25).
 *
 *   RESTORE_VERIFY_URL=... npx tsx scripts/restore-verify.ts
 *
 * Hard-refuses to run against anything whose database name is not exactly
 * `fatoora_restore` — no override flag, and the URL is never echoed or
 * logged, matching the convention in `docs/SESSION_HANDOFF_2026-08-18.md` §5
 * ("never construct or print the actual connection string").
 *
 * Checks, in order:
 *   1. The latest row in `_prisma_migrations` matches the newest directory
 *      under `prisma/migrations/` — a restore that's missing recent
 *      migrations looks fine until the first query that touches a column
 *      those migrations added.
 *   2. Non-zero row counts on the core tables — a restore that ran but
 *      landed on an empty database is a silent, worse failure than one that
 *      errors outright.
 *   3. Per-company sequence integrity (`getSequenceIntegrity`, the same
 *      function W22 wired into `GET /api/clearance`) — a restore that lost
 *      the tail of the invoice table looks identical to a live sequence gap.
 *   4. A PIH chain spot-check on each company's most recent invoices:
 *      `previousHash` of invoice *k* must equal `hash` of invoice *k-1* by
 *      `createdAt` order — a restore that landed mid-chain (e.g. a backup
 *      taken between the hash commit and the row write, which can't happen
 *      in production because both are in the same transaction, but a restore
 *      tool has its own failure modes) would show up here.
 *
 * Uses `process.exitCode`, not `process.exit()` — see F-C
 * (`docs/audit/2026-08-18-findings.md`): calling `process.exit()` while an
 * `AbortSignal.timeout()` (or, here, an open Prisma connection) is still
 * pending races libuv's teardown on Windows.
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { getSequenceIntegrity } from "../lib/services/sequence-gaps";

const RESTORE_DB_NAME = "fatoora_restore";

function dbNameOf(url: string): string {
  return new URL(url).pathname.replace(/^\//, "");
}

const url = process.env.RESTORE_VERIFY_URL;
if (!url) {
  console.error("Set RESTORE_VERIFY_URL to the fatoora_restore connection string first.");
  process.exitCode = 1;
}

if (url && dbNameOf(url) !== RESTORE_DB_NAME) {
  console.error(
    `Refusing: target database name is not exactly "${RESTORE_DB_NAME}". This script only verifies the disposable restore-drill target.`,
  );
  process.exitCode = 1;
}

let failed = false;
function report(check: string, pass: boolean, detail = "") {
  console.log(`${pass ? "✓ PASS" : "✗ FAIL"}  ${check}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failed = true;
}
function warn(check: string, detail: string) {
  console.log(`! WARN  ${check} — ${detail}`);
}

async function main(dbUrl: string) {
  const db = new PrismaClient({ datasourceUrl: dbUrl });

  // ---- 1. Migration currency -------------------------------------------
  const migrationsDir = path.join(__dirname, "..", "prisma", "migrations");
  const dirs = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const newestOnDisk = dirs[dirs.length - 1];

  const applied = await db.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL
    ORDER BY finished_at DESC LIMIT 1`;
  const newestApplied = applied[0]?.migration_name;
  report(
    "restored database has the newest migration applied",
    newestApplied === newestOnDisk,
    `disk=${newestOnDisk} applied=${newestApplied ?? "none"}`,
  );

  // ---- 2. Core table row counts -----------------------------------------
  const coreTables: Array<[string, () => Promise<number>]> = [
    ["Company", () => db.company.count()],
    ["Invoice", () => db.invoice.count()],
    ["InvoiceLine", () => db.invoiceLine.count()],
    ["Certificate", () => db.certificate.count()],
    ["SecurityEvent", () => db.securityEvent.count()],
  ];
  for (const [name, count] of coreTables) {
    const n = await count();
    if (n > 0) report(`${name} has rows`, true, `${n} rows`);
    else warn(`${name} has rows`, "0 rows — expected on an empty source, otherwise investigate");
  }

  // ---- 3. Per-company sequence integrity --------------------------------
  const companies = await db.company.findMany({ select: { id: true, name: true } });
  for (const company of companies) {
    const integrity = await getSequenceIntegrity(company.id, db);
    report(
      `sequence integrity intact — ${company.name}`,
      integrity.intact,
      `missing=${integrity.missing} extra=${integrity.extra}`,
    );
  }

  // ---- 4. PIH chain spot-check (last 20 invoices per company) -----------
  for (const company of companies) {
    const invoices = await db.invoice.findMany({
      where: { companyId: company.id, hash: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { hash: true, previousHash: true, invoiceNumber: true },
      take: 20,
    });
    let chainOk = true;
    let brokenAt = "";
    for (let i = 1; i < invoices.length; i++) {
      if (invoices[i].previousHash !== invoices[i - 1].hash) {
        chainOk = false;
        brokenAt = invoices[i].invoiceNumber;
        break;
      }
    }
    if (invoices.length < 2) {
      warn(`PIH chain spot-check — ${company.name}`, "fewer than 2 signed invoices, nothing to link");
    } else {
      report(`PIH chain spot-check — ${company.name}`, chainOk, chainOk ? `${invoices.length} invoices linked` : `break at ${brokenAt}`);
    }
  }

  await db.$disconnect();
}

if (process.exitCode !== 1 && url) {
  main(url)
    .then(() => {
      process.exitCode = failed ? 1 : 0;
    })
    .catch((err) => {
      console.error("restore-verify crashed:", err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    });
}
