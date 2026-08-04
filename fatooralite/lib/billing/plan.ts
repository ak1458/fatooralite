import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";

export type PlanId = "free" | "pro";

/**
 * Plan limits — PLACEHOLDER numbers pending the owner's real pricing
 * decision (payment processor for KSA merchants — Moyasar/Tap/Paddle — is
 * not yet chosen; see fatooralite/prisma/schema.prisma Subscription model).
 * `null` means unlimited. Do not treat these as final; they exist purely to
 * give the enforcement layer something to enforce against.
 */
export const PLAN_LIMITS = {
  free: { invoicesPerMonth: 20, branches: 1, seats: 2 },
  pro: { invoicesPerMonth: null, branches: null, seats: null },
} as const;

export type PlanLimits = (typeof PLAN_LIMITS)[PlanId];

/**
 * Pro plan price in halalas (SAR's smallest unit — Moyasar's Invoices API
 * takes amounts in this unit). PLACEHOLDER, same caveat as PLAN_LIMITS: the
 * owner has not made a final pricing decision. 149.00 SAR/month.
 */
export const PRO_PRICE_HALALAS = 14_900;

/** How long a single paid invoice grants Pro for. No auto-recurring charge yet — see lib/billing/moyasar.ts; renewal is a repeat checkout, not a saved-card auto-charge. */
export const PRO_PERIOD_DAYS = 30;

/**
 * Resolves the effective plan for a company. A company may have no
 * Subscription row at all (nothing creates one yet) — that is treated
 * identically to an explicit free/active row. "pro" is only returned when
 * the row exists AND plan === "pro" AND status === "active" AND (no
 * currentPeriodEnd is set, or it hasn't passed yet); any other state (no
 * row, free, past_due, canceled, expired period) falls back to "free".
 * This is the conservative default for a compliance product: a lapsed or
 * unrenewed payment must not silently keep pro-tier limits.
 */
export async function getEffectivePlan(companyId: string, db: PrismaClient = defaultDb): Promise<PlanId> {
  const sub = await db.subscription.findUnique({ where: { companyId } });
  if (!sub || sub.plan !== "pro" || sub.status !== "active") return "free";
  if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < Date.now()) return "free";
  return "pro";
}

/** First instant of the current calendar month, in local server time. */
function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export interface InvoiceLimitCheck {
  allowed: boolean;
  limit: number | null;
  used: number;
}

/**
 * Checks whether the company may issue another invoice this calendar month
 * under its effective plan. Unlimited plans (limit === null) always report
 * allowed: true but still return the real usage count for display.
 */
export async function checkInvoiceLimit(companyId: string, db: PrismaClient = defaultDb): Promise<InvoiceLimitCheck> {
  const plan = await getEffectivePlan(companyId, db);
  const limit = PLAN_LIMITS[plan].invoicesPerMonth;

  const used = await db.invoice.count({
    where: { companyId, createdAt: { gte: startOfCurrentMonth() } },
  });

  return limit === null ? { allowed: true, limit: null, used } : { allowed: used < limit, limit, used };
}
