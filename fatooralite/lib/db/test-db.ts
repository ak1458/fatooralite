import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

/**
 * DB integration tests need a real Postgres. They are skipped unless
 * TEST_DATABASE_URL is set (a disposable Postgres — e.g. local docker or a
 * throwaway Supabase branch). Run them single-threaded:
 *   TEST_DATABASE_URL=postgres://... npx vitest run --no-file-parallelism lib/db lib/services
 */
export const TEST_DB_URL = process.env.TEST_DATABASE_URL;
export const hasTestDb = Boolean(TEST_DB_URL);

/**
 * Reset + create the schema in the test database.
 *
 * Takes ~20-30s against Neon — vitest's default hookTimeout (10s) is too
 * short for a beforeAll calling this; pass --hookTimeout=60000 (or higher)
 * to any `vitest run` invocation that includes a file using it, or the hook
 * gets killed mid-push, leaving the schema half-reset for every test file
 * that runs afterward (Phase 3 / W13 — this exact failure mode cost real
 * debugging time before `stdio` below stopped being "ignore").
 *
 * `stdio` was previously "ignore", which silently discarded the real Prisma
 * CLI error on failure — every downstream symptom (later files seeing
 * "table does not exist") was traced back to this only after the fact.
 * Capture output and surface it on failure instead.
 */
export function pushTestSchema(): void {
  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss --force-reset", {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: TEST_DB_URL!, DIRECT_URL: TEST_DB_URL! },
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    throw new Error(
      `pushTestSchema failed:\n--- stdout ---\n${e.stdout ?? ""}\n--- stderr ---\n${e.stderr ?? e.message ?? String(err)}`,
    );
  }
}

export function testClient(): PrismaClient {
  return new PrismaClient({ datasourceUrl: TEST_DB_URL });
}
