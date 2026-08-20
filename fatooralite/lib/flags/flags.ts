import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import { log } from "@/lib/log/logger";
import { FLAG_DEFAULTS, FLAG_NAMES, envOverrideName, type FlagName } from "./registry";

/**
 * Resolve one flag for one company. Precedence, highest first:
 *   1. Env override (`FEATURE_<FLAG>=true|false`) — a global kill switch,
 *      independent of any per-company row (A-217's rollback path).
 *   2. Per-company `FeatureFlag` row.
 *   3. Code default (`FLAG_DEFAULTS`).
 *
 * A DB error resolves to the code default, logged, never thrown — a flag
 * lookup must not be able to take a request down (same posture as
 * `recordSecurityEvent`).
 */
export async function isFlagEnabled(companyId: string, flag: FlagName, db: PrismaClient = defaultDb): Promise<boolean> {
  const envValue = process.env[envOverrideName(flag)];
  if (envValue === "true") return true;
  if (envValue === "false") return false;

  try {
    const row = await db.featureFlag.findUnique({ where: { companyId_flag: { companyId, flag } } });
    if (row) return row.enabled;
  } catch (err) {
    log.warn("flags.lookup_failed", { flag, error: err instanceof Error ? err.message : String(err) });
  }
  return FLAG_DEFAULTS[flag];
}

/** Every flag resolved for one company — used by GET /api/flags. */
export async function resolveFlags(companyId: string, db: PrismaClient = defaultDb): Promise<Record<FlagName, boolean>> {
  const entries = await Promise.all(FLAG_NAMES.map(async (flag) => [flag, await isFlagEnabled(companyId, flag, db)] as const));
  return Object.fromEntries(entries) as Record<FlagName, boolean>;
}
