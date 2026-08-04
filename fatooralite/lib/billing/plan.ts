import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import {
  FEATURE_LABELS,
  PLAN_LIMITS,
  hasFeature,
  resolvePlan,
  trialDaysRemaining,
  trialEndFrom,
  type Feature,
  type PlanId,
  type PlanLimits,
  type SubscriptionState,
} from "./entitlements";

export {
  FEATURE_LABELS,
  PLAN_LIMITS,
  PRO_PERIOD_DAYS,
  PRO_PRICE_HALALAS,
  TRIAL_DAYS,
  hasFeature,
  proPeriodEndFrom,
  resolvePlan,
  trialEndFrom,
} from "./entitlements";
export type { Feature, PlanId, PlanLimits } from "./entitlements";

/**
 * Thin database layer over lib/billing/entitlements.ts. Everything with a
 * decision in it lives there, pure and fully unit-tested; this file only reads
 * rows and counts.
 */

/** Resolved licensing state for one tenant — one query, reused by every gate. */
export interface TenantPlan {
  plan: PlanId;
  limits: PlanLimits;
  /** Whole days left in a trial, or null when not on one. */
  trialDaysLeft: number | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

export async function getTenantPlan(companyId: string, db: PrismaClient = defaultDb): Promise<TenantPlan> {
  const sub = await db.subscription.findUnique({ where: { companyId } });
  const state: SubscriptionState | null = sub
    ? {
        plan: sub.plan,
        status: sub.status,
        trialEndsAt: sub.trialEndsAt,
        currentPeriodEnd: sub.currentPeriodEnd,
      }
    : null;
  const plan = resolvePlan(state);
  return {
    plan,
    limits: PLAN_LIMITS[plan],
    trialDaysLeft: trialDaysRemaining(state),
    trialEndsAt: sub?.trialEndsAt ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
  };
}

export async function getEffectivePlan(companyId: string, db: PrismaClient = defaultDb): Promise<PlanId> {
  return (await getTenantPlan(companyId, db)).plan;
}

/**
 * Starts a tenant's 7-day trial. Called in the registration transaction, so it
 * takes the transactional client rather than reaching for the default one.
 * Idempotent: re-registering against an existing company must not restart a
 * trial or downgrade a paying customer.
 */
export async function startTrial(
  companyId: string,
  db: Pick<PrismaClient, "subscription">,
  now: Date = new Date(),
): Promise<void> {
  await db.subscription.upsert({
    where: { companyId },
    create: { companyId, plan: "trial", status: "active", trialEndsAt: trialEndFrom(now) },
    update: {},
  });
}

/** First instant of the current calendar month, in local server time. */
function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export interface LimitCheck {
  allowed: boolean;
  /** null means unlimited. */
  limit: number | null;
  used: number;
  plan: PlanId;
}

/** Whether the company may issue another invoice this calendar month. */
export async function checkInvoiceLimit(companyId: string, db: PrismaClient = defaultDb): Promise<LimitCheck> {
  const { plan, limits } = await getTenantPlan(companyId, db);
  const used = await db.invoice.count({ where: { companyId, createdAt: { gte: startOfCurrentMonth() } } });
  const limit = limits.invoicesPerMonth;
  return limit === null ? { allowed: true, limit: null, used, plan } : { allowed: used < limit, limit, used, plan };
}

/** Whether the company may add another branch. */
export async function checkBranchLimit(companyId: string, db: PrismaClient = defaultDb): Promise<LimitCheck> {
  const { plan, limits } = await getTenantPlan(companyId, db);
  const used = await db.branch.count({ where: { companyId } });
  const limit = limits.branches;
  return limit === null ? { allowed: true, limit: null, used, plan } : { allowed: used < limit, limit, used, plan };
}

/** Whether the company may add another user. */
export async function checkSeatLimit(companyId: string, db: PrismaClient = defaultDb): Promise<LimitCheck> {
  const { plan, limits } = await getTenantPlan(companyId, db);
  const used = await db.user.count({ where: { companyId } });
  const limit = limits.seats;
  return limit === null ? { allowed: true, limit: null, used, plan } : { allowed: used < limit, limit, used, plan };
}

export interface FeatureDenial {
  feature: Feature;
  featureLabel: string;
  plan: PlanId;
  message: string;
}

/**
 * Server-side entitlement gate. Returns null when allowed, or a denial the
 * caller turns into a 402 body.
 *
 * This is the only authority on entitlement — a hidden or disabled control in
 * the UI is a courtesy, never the boundary.
 */
export async function requireFeature(
  companyId: string,
  feature: Feature,
  db: PrismaClient = defaultDb,
): Promise<FeatureDenial | null> {
  const { plan } = await getTenantPlan(companyId, db);
  if (hasFeature(plan, feature)) return null;
  const featureLabel = FEATURE_LABELS[feature];
  return {
    feature,
    featureLabel,
    plan,
    message:
      plan === "expired"
        ? `Your trial has ended. Upgrade to Pro to continue — ${featureLabel.toLowerCase()} is unavailable on an expired trial.`
        : `${featureLabel} is a Pro feature. Upgrade to unlock it.`,
  };
}
