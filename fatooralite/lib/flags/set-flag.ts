import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import { recordSecurityEvent, SECURITY_EVENTS } from "@/lib/audit/events";
import type { FlagName } from "./registry";

export interface SetFlagInput {
  companyId: string;
  flag: FlagName;
  /** `null` deletes the row — falls back to the env override / code default. */
  enabled: boolean | null;
  actor: { id?: string | null; email?: string | null };
}

/** Write (or clear) one company's flag row, and audit the change (A-221). */
export async function setFlag(input: SetFlagInput, db: PrismaClient = defaultDb): Promise<void> {
  if (input.enabled === null) {
    await db.featureFlag.deleteMany({ where: { companyId: input.companyId, flag: input.flag } });
  } else {
    await db.featureFlag.upsert({
      where: { companyId_flag: { companyId: input.companyId, flag: input.flag } },
      create: { companyId: input.companyId, flag: input.flag, enabled: input.enabled },
      update: { enabled: input.enabled },
    });
  }

  await recordSecurityEvent(
    {
      action: SECURITY_EVENTS.featureFlagChanged,
      outcome: "success",
      companyId: input.companyId,
      actorId: input.actor.id ?? null,
      actorEmail: input.actor.email ?? null,
      metadata: { flag: input.flag, enabled: input.enabled },
    },
    db,
  );
}
