import { NextResponse } from "next/server";
import type { FeatureDenial, LimitCheck } from "./plan";
import { FEATURE_LABELS, type Feature, type PlanId } from "./entitlements";

/**
 * The single shape every entitlement refusal takes, so the client can render a
 * real explanation and an upgrade path instead of a generic error. HTTP 402
 * Payment Required throughout.
 */
export interface UpgradeRequiredBody {
  error: string;
  reason: "limit" | "feature";
  plan: PlanId;
  feature?: Feature;
  featureLabel?: string;
  limit?: number | null;
  used?: number;
  upgradeUrl: string;
}

const UPGRADE_URL = "/settings?tab=billing";

export function limitReached(
  check: LimitCheck,
  what: "invoices" | "branches" | "seats",
): NextResponse<UpgradeRequiredBody> {
  const noun = { invoices: "invoices this month", branches: "branches", seats: "team members" }[what];
  const error =
    check.plan === "expired"
      ? `Your trial has ended. Upgrade to Pro to continue issuing ${noun}.`
      : `Trial limit reached — ${check.limit} ${noun}. Upgrade to Pro for unlimited.`;

  return NextResponse.json(
    {
      error,
      reason: "limit" as const,
      plan: check.plan,
      limit: check.limit,
      used: check.used,
      upgradeUrl: UPGRADE_URL,
    },
    { status: 402 },
  );
}

export function featureLocked(denial: FeatureDenial): NextResponse<UpgradeRequiredBody> {
  return NextResponse.json(
    {
      error: denial.message,
      reason: "feature" as const,
      plan: denial.plan,
      feature: denial.feature,
      featureLabel: denial.featureLabel ?? FEATURE_LABELS[denial.feature],
      upgradeUrl: UPGRADE_URL,
    },
    { status: 402 },
  );
}
