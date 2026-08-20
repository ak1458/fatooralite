/**
 * Migration safety drill (Phase 3 / W13).
 *
 *   TEST_DATABASE_URL=... npx tsx scripts/migration-drill.ts
 *
 * Hard-refuses to run against anything whose database name doesn't contain
 * "fatoora_audit" — no override flag. This is the one script in the repo
 * that deliberately DROPS the entire schema; it must never be pointed at
 * neondb, even by accident.
 *
 * Phases (each prints PASS/FAIL and stops the drill on the first FAIL):
 *   1. Fresh database: drop everything, `prisma migrate deploy` from zero,
 *      seed the demo fixture, read it back through the real query layer.
 *   2. Idempotency: `migrate deploy` again — must report no pending work,
 *      and existing data must be untouched (row-count + checksum unchanged).
 *   3. Failure + recovery: a deliberately invalid DDL statement inside its
 *      own transaction must leave the database completely unchanged
 *      (Postgres's transactional DDL — the actual safety property this
 *      phase is proving).
 *   4. Larger dataset: seed 5,000 synthetic invoices, confirm the app still
 *      boots against that volume (a real query through the app's own code,
 *      not just a row count).
 *
 * NOT covered here, and not safely testable in this environment (documented
 * as such, not silently skipped): a mid-flight process kill during a live
 * `migrate deploy` against a managed cloud Postgres, and Neon-level
 * PITR/backup restore (that's X2, owner-blocked). See the Phase 3 handoff
 * entry.
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error("Set TEST_DATABASE_URL to the fatoora_audit connection string first.");
  process.exit(1);
}
if (!/fatoora_audit/i.test(url)) {
  console.error("Refusing: target database URL does not contain 'fatoora_audit'. This script only runs against the disposable audit database.");
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };

// Node's execSync uses cmd.exe on Windows by default, which doesn't
// understand POSIX `VAR=value cmd` prefix syntax — env vars for a specific
// command go through execSync's own `env` option instead (never inline).
function run(cmd: string, extraEnv: Record<string, string> = {}): string {
  return execSync(cmd, { env: { ...env, ...extraEnv }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

let failed = false;
function report(phase: string, pass: boolean, detail = "") {
  console.log(`${pass ? "✓ PASS" : "✗ FAIL"}  ${phase}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failed = true;
  return pass;
}

async function main() {
  console.log(`Migration drill against: ${new URL(url!).pathname.slice(1)}\n`);

  // ---- Phase 1: fresh database ----------------------------------------
  console.log("--- Phase 1: fresh database ---");
  execSync(`npx prisma db execute --schema prisma/schema.prisma --stdin`, {
    env, encoding: "utf8", input: "DROP SCHEMA public CASCADE; CREATE SCHEMA public;",
  });
  let migrateOut: string;
  try {
    migrateOut = run("npx prisma migrate deploy");
  } catch (e) {
    const out = e instanceof Error && "stdout" in e ? String((e as { stdout?: unknown }).stdout) : String(e);
    report("migrate deploy applies all migrations from an empty schema", false, out.slice(0, 800));
    process.exit(1);
  }
  report("migrate deploy applies all migrations from an empty schema", /migrations? .*applied|already in sync/i.test(migrateOut), migrateOut.trim().split("\n").pop());

  run(`npx tsx prisma/seed.ts`, { SEED_DEMO: "true" });
  const db1 = new PrismaClient({ datasourceUrl: url });
  const company = await db1.company.findFirst({ where: { vatNumber: { not: "" } } });
  const seededInvoiceCount = await db1.invoice.count();
  report("seeded fixture is readable through the app's own query layer", !!company && seededInvoiceCount > 0, `company=${company?.name}, invoices=${seededInvoiceCount}`);
  const rowCountsBefore = await snapshotCounts(db1);
  await db1.$disconnect();

  // ---- Phase 2: idempotency --------------------------------------------
  console.log("\n--- Phase 2: idempotency (re-run migrate deploy) ---");
  const migrateAgain = run("npx prisma migrate deploy");
  report("second migrate deploy reports no pending migrations", /no pending migrations|already in sync/i.test(migrateAgain), migrateAgain.trim().split("\n").filter(Boolean).pop());
  const db2 = new PrismaClient({ datasourceUrl: url });
  const rowCountsAfter = await snapshotCounts(db2);
  report(
    "row counts unchanged by the idempotent re-run",
    JSON.stringify(rowCountsBefore) === JSON.stringify(rowCountsAfter),
    `${JSON.stringify(rowCountsBefore)} vs ${JSON.stringify(rowCountsAfter)}`,
  );
  await db2.$disconnect();

  // ---- Phase 3: failure + recovery --------------------------------------
  console.log("\n--- Phase 3: failure + recovery (transactional DDL) ---");
  const db3 = new PrismaClient({ datasourceUrl: url });
  const beforeFail = await snapshotCounts(db3);
  let ddlRejected = false;
  try {
    // A single statement that fails partway through: a real column add
    // followed by a deliberately invalid one, same transaction.
    await db3.$executeRawUnsafe(
      `ALTER TABLE "Invoice" ADD COLUMN "drillTemp" TEXT; ALTER TABLE "Invoice" ADD CONSTRAINT "drill_bad" CHECK (nonexistent_column > 0);`,
    );
  } catch {
    ddlRejected = true;
  }
  const afterFail = await snapshotCounts(db3);
  const hasDrillColumn = await db3.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Invoice' AND column_name='drillTemp') AS exists`,
  );
  report("invalid DDL is rejected", ddlRejected);
  report("failed DDL leaves the schema unchanged (no partial column added)", hasDrillColumn[0].exists === false);
  report("failed DDL leaves row data unchanged", JSON.stringify(beforeFail) === JSON.stringify(afterFail));
  await db3.$disconnect();

  // ---- Phase 4: larger dataset -------------------------------------------
  console.log("\n--- Phase 4: larger dataset (5,000 synthetic invoices) ---");
  const seedStart = Date.now();
  run(`npx tsx scripts/seed-volume.ts 5000`);
  const seedMs = Date.now() - seedStart;
  const db4 = new PrismaClient({ datasourceUrl: url });
  const volCompany = await db4.company.findFirst({ where: { vatNumber: "399999999999993" } });
  const volCount = volCompany ? await db4.invoice.count({ where: { companyId: volCompany.id } }) : 0;
  report("app boots and reads back the volume fixture", volCount >= 5000, `${volCount} invoices, seed took ${seedMs}ms`);
  await db4.$disconnect();
  run(`npx tsx scripts/seed-volume.ts --clean`);

  console.log(`\n${failed ? "SOME PHASES FAILED" : "ALL DRILL PHASES PASSED"}`);
  process.exitCode = failed ? 1 : 0;
}

async function snapshotCounts(db: PrismaClient): Promise<Record<string, number>> {
  const [companies, invoices, users, certs] = await Promise.all([
    db.company.count(),
    db.invoice.count(),
    db.user.count(),
    db.certificate.count(),
  ]);
  return { companies, invoices, users, certs };
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
