import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import { computeInsights } from "@/lib/ai/insights";

/**
 * Turn the live compliance insights into persisted notifications. Only
 * actionable (non "ac") insights become notifications, and we de-duplicate
 * against existing UNREAD notifications so repeated runs don't spam the inbox.
 */
export async function generateNotifications(
  companyId: string,
  db: PrismaClient = defaultDb,
): Promise<{ created: number }> {
  const { insights } = await computeInsights(companyId, db);

  const actionable = insights.filter((i) => i.tone !== "ac");
  if (actionable.length === 0) return { created: 0 };

  const existing = await db.notification.findMany({
    where: { companyId, read: false },
    select: { title: true },
  });
  const seen = new Set(existing.map((n) => n.title));

  const toCreate = actionable
    .filter((i) => !seen.has(i.title))
    .map((i) => ({
      companyId,
      title: i.title,
      message: i.body,
      type: i.tone === "warn" ? "warning" : "info",
    }));

  if (toCreate.length === 0) return { created: 0 };

  await db.notification.createMany({ data: toCreate });
  return { created: toCreate.length };
}
