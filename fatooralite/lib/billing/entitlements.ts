/**
 * Plan resolution and feature entitlements.
 *
 * Everything here is pure — no Prisma, no request context — so every state a
 * tenant can be in is unit-testable without a database. `lib/billing/plan.ts`
 * is the thin DB-reading layer on top.
 *
 * Fatoora Lite Pro is paid-only. There is no permanent free tier: a tenant is
 * in a 7-day trial, on Pro, or expired.
 */

export type PlanId = "trial" | "pro" | "expired";

export const TRIAL_DAYS = 7;

/** How long a single paid invoice grants Pro for. Renewal is a repeat checkout. */
export const PRO_PERIOD_DAYS = 30;

/**
 * Pro price in halalas (SAR's smallest unit — what Moyasar's Invoices API
 * takes). PLACEHOLDER pending the pricing decision in launch plan Phase 7.
 * 149.00 SAR/month.
 */
export const PRO_PRICE_HALALAS = 14_900;

export interface PlanLimits {
  /** null means unlimited. */
  invoicesPerMonth: number | null;
  branches: number | null;
  seats: number | null;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  trial: { invoicesPerMonth: 25, branches: 1, seats: 2 },
  pro: { invoicesPerMonth: null, branches: null, seats: null },
  // An expired trial cannot issue anything new. It is NOT locked out: reading
  // and exporting already-filed invoices stays available, because withholding
  // a tenant's own ZATCA-filed documents behind a paywall is a liability, not
  // a growth tactic.
  expired: { invoicesPerMonth: 0, branches: 0, seats: 0 },
};

/**
 * Capabilities gated by plan. Read paths (viewing, exporting, downloading a
 * PDF of an existing invoice) are deliberately absent — they are never gated.
 */
export type Feature =
  | "issueInvoice"
  | "submitToZatca"
  | "multiBranch"
  | "additionalSeats"
  | "aiWriteActions"
  | "bulkImport"
  | "apiKeys"
  | "customBranding"
  | "advancedReports";

const TRIAL_FEATURES: ReadonlySet<Feature> = new Set<Feature>([
  // The whole compliance path is available during the trial — a ZATCA product
  // that will not let you actually clear an invoice has demonstrated nothing.
  "issueInvoice",
  "submitToZatca",
]);

/** Human-readable reason shown in a 402 body and on disabled controls. */
export const FEATURE_LABELS: Record<Feature, string> = {
  issueInvoice: "Issuing invoices",
  submitToZatca: "Submitting to ZATCA",
  multiBranch: "Multiple branches",
  additionalSeats: "Additional team members",
  aiWriteActions: "AI assistant actions",
  bulkImport: "Bulk import and export",
  apiKeys: "API access",
  customBranding: "Custom invoice branding",
  advancedReports: "Advanced reports",
};

/** The subscription fields plan resolution depends on. */
export interface SubscriptionState {
  plan: string;
  status: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

/**
 * Resolves the effective plan.
 *
 * Deliberately conservative: any state that is not unambiguously an active
 * paid subscription or an unexpired trial resolves downward. A lapsed payment
 * must never silently keep Pro limits, and a missing row must never be more
 * permissive than an explicit one.
 *
 * `null` (no Subscription row at all) resolves to `expired` rather than
 * `trial`. A trial is something registration grants explicitly, with a
 * recorded end date; inferring one from an absent row would hand a fresh
 * 7 days to anyone whose row was deleted.
 */
export function resolvePlan(sub: SubscriptionState | null, now: Date = new Date()): PlanId {
  if (!sub) return "expired";

  if (sub.plan === "pro" && sub.status === "active") {
    if (!sub.currentPeriodEnd || sub.currentPeriodEnd.getTime() > now.getTime()) return "pro";
    return "expired";
  }

  if (sub.plan === "trial" && sub.status === "active") {
    if (sub.trialEndsAt && sub.trialEndsAt.getTime() > now.getTime()) return "trial";
    return "expired";
  }

  return "expired";
}

export function planLimits(plan: PlanId): PlanLimits {
  return PLAN_LIMITS[plan];
}

/** Whether `plan` entitles the tenant to `feature`. */
export function hasFeature(plan: PlanId, feature: Feature): boolean {
  if (plan === "pro") return true;
  if (plan === "trial") return TRIAL_FEATURES.has(feature);
  return false;
}

/** Whole-number days left in a trial, floored at 0. Null for any other plan. */
export function trialDaysRemaining(sub: SubscriptionState | null, now: Date = new Date()): number | null {
  if (resolvePlan(sub, now) !== "trial" || !sub?.trialEndsAt) return null;
  const ms = sub.trialEndsAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/** The trial end date for a company registering at `now`. */
export function trialEndFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + TRIAL_DAYS * 86_400_000);
}

/** The Pro period end for a payment captured at `now`. */
export function proPeriodEndFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + PRO_PERIOD_DAYS * 86_400_000);
}

/** What a usage counter looks like to the client. `null` limit means unlimited. */
export interface UsageCounter {
  used: number;
  limit: number | null;
}

export type LimitKind = "invoices" | "branches" | "seats";

const LIMIT_NOUNS: Record<LimitKind, string> = {
  invoices: "invoices this month",
  branches: "branches",
  seats: "team members",
};

/**
 * Whether a tenant may consume one more of `kind`, and the sentence to show if
 * not. Pure, so the UI gate and its tests share one implementation.
 *
 * Fails **open** on an unknown plan: the server returns 402 if the tenant is
 * genuinely over the limit, so failing open costs a round trip, whereas
 * failing closed would lock a paying customer out of their own product because
 * one request did not land.
 */
export function checkLimit(
  plan: PlanId | null,
  kind: LimitKind,
  usage: UsageCounter | null,
): { allowed: boolean; reason: string | null } {
  if (!plan || !usage) return { allowed: true, reason: null };
  if (usage.limit === null || usage.used < usage.limit) return { allowed: true, reason: null };
  const noun = LIMIT_NOUNS[kind];
  return {
    allowed: false,
    reason:
      plan === "expired"
        ? `Your trial has ended. Upgrade to Pro to add more ${noun}.`
        : `Trial limit reached — ${usage.limit} ${noun}. Upgrade to Pro for unlimited.`,
  };
}
