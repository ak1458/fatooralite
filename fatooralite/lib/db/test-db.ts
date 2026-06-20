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

/** Reset + create the schema in the test database. */
export function pushTestSchema(): void {
  execSync("npx prisma db push --skip-generate --accept-data-loss --force-reset", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: TEST_DB_URL!, DIRECT_URL: TEST_DB_URL! },
    stdio: "ignore",
  });
}

export function testClient(): PrismaClient {
  return new PrismaClient({ datasourceUrl: TEST_DB_URL });
}
