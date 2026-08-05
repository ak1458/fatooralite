import { describe, it, expect } from "vitest";
import {
  checkLimit,
  FEATURE_LABELS,
  PLAN_LIMITS,
  TRIAL_DAYS,
  hasFeature,
  planLimits,
  proPeriodEndFrom,
  resolvePlan,
  trialDaysRemaining,
  trialEndFrom,
  type Feature,
  type SubscriptionState,
} from "./entitlements";

const NOW = new Date("2026-08-04T12:00:00Z");
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

function sub(overrides: Partial<SubscriptionState> = {}): SubscriptionState {
  return { plan: "trial", status: "active", trialEndsAt: days(3), currentPeriodEnd: null, ...overrides };
}

describe("resolvePlan", () => {
  it("resolves an unexpired active trial to trial", () => {
    expect(resolvePlan(sub(), NOW)).toBe("trial");
  });

  it("resolves an elapsed trial to expired", () => {
    expect(resolvePlan(sub({ trialEndsAt: days(-1) }), NOW)).toBe("expired");
  });

  it("treats a trial with no end date as expired rather than unlimited", () => {
    expect(resolvePlan(sub({ trialEndsAt: null }), NOW)).toBe("expired");
  });

  it("resolves an active subscription with a future period end to pro", () => {
    expect(resolvePlan(sub({ plan: "pro", trialEndsAt: null, currentPeriodEnd: days(20) }), NOW)).toBe("pro");
  });

  it("resolves an active subscription with no period end to pro", () => {
    expect(resolvePlan(sub({ plan: "pro", trialEndsAt: null, currentPeriodEnd: null }), NOW)).toBe("pro");
  });

  it("lapses an unrenewed pro subscription instead of keeping it forever", () => {
    expect(resolvePlan(sub({ plan: "pro", trialEndsAt: null, currentPeriodEnd: days(-1) }), NOW)).toBe("expired");
  });

  it.each(["past_due", "canceled", "incomplete", ""])("resolves pro with status %s to expired", (status) => {
    expect(resolvePlan(sub({ plan: "pro", status, trialEndsAt: null, currentPeriodEnd: days(20) }), NOW)).toBe(
      "expired",
    );
  });

  it("resolves a trial that is not active to expired", () => {
    expect(resolvePlan(sub({ status: "canceled" }), NOW)).toBe("expired");
  });

  // A missing row must not be more permissive than an explicit one: inferring
  // a fresh trial from an absent Subscription would hand 7 more days to anyone
  // whose row was deleted.
  it("resolves a missing subscription row to expired, not trial", () => {
    expect(resolvePlan(null, NOW)).toBe("expired");
  });

  it("resolves an unrecognised plan name to expired", () => {
    expect(resolvePlan(sub({ plan: "enterprise" }), NOW)).toBe("expired");
  });

  it("expires exactly at the boundary instant, not after it", () => {
    const at = new Date(NOW);
    expect(resolvePlan(sub({ trialEndsAt: at }), NOW)).toBe("expired");
    expect(resolvePlan(sub({ trialEndsAt: new Date(at.getTime() + 1) }), NOW)).toBe("trial");
  });

  it("defaults `now` to the current time", () => {
    expect(resolvePlan(sub({ trialEndsAt: new Date(Date.now() + 60_000) }))).toBe("trial");
    expect(resolvePlan(sub({ trialEndsAt: new Date(Date.now() - 60_000) }))).toBe("expired");
  });
});

describe("PLAN_LIMITS", () => {
  it("caps the trial but keeps the whole compliance path usable", () => {
    expect(PLAN_LIMITS.trial).toEqual({ invoicesPerMonth: 25, branches: 1, seats: 2 });
  });

  it("makes pro unlimited across the board", () => {
    expect(PLAN_LIMITS.pro).toEqual({ invoicesPerMonth: null, branches: null, seats: null });
  });

  it("gives expired a zero issuance allowance rather than unlimited", () => {
    expect(PLAN_LIMITS.expired.invoicesPerMonth).toBe(0);
  });

  it("never expresses a limit as null except on pro", () => {
    // null means unlimited; an accidental null on trial or expired would be a
    // silent entitlement grant.
    expect(Object.values(PLAN_LIMITS.trial).every((v) => typeof v === "number")).toBe(true);
    expect(Object.values(PLAN_LIMITS.expired).every((v) => typeof v === "number")).toBe(true);
  });

  it("planLimits returns the row for the plan", () => {
    expect(planLimits("trial")).toBe(PLAN_LIMITS.trial);
  });
});

describe("hasFeature", () => {
  const ALL = Object.keys(FEATURE_LABELS) as Feature[];

  it("grants pro everything", () => {
    ALL.forEach((f) => expect(hasFeature("pro", f)).toBe(true));
  });

  it("grants the trial the full compliance path", () => {
    expect(hasFeature("trial", "issueInvoice")).toBe(true);
    expect(hasFeature("trial", "submitToZatca")).toBe(true);
  });

  it.each<Feature>([
    "multiBranch",
    "additionalSeats",
    "aiWriteActions",
    "bulkImport",
    "apiKeys",
    "customBranding",
    "advancedReports",
  ])("reserves %s for pro", (feature) => {
    expect(hasFeature("trial", feature)).toBe(false);
  });

  it("grants expired nothing", () => {
    ALL.forEach((f) => expect(hasFeature("expired", f)).toBe(false));
  });

  it("has a label for every feature, so a 402 can always explain itself", () => {
    ALL.forEach((f) => expect(FEATURE_LABELS[f]).toBeTruthy());
  });
});

describe("trialDaysRemaining", () => {
  it("rounds a partial day up so 'today' never reads as 0 days left", () => {
    expect(trialDaysRemaining(sub({ trialEndsAt: new Date(NOW.getTime() + 3.2 * 86_400_000) }), NOW)).toBe(4);
    expect(trialDaysRemaining(sub({ trialEndsAt: new Date(NOW.getTime() + 3600_000) }), NOW)).toBe(1);
  });

  it("returns null once the trial has elapsed", () => {
    expect(trialDaysRemaining(sub({ trialEndsAt: days(-1) }), NOW)).toBeNull();
  });

  it("returns null for pro and for a missing row", () => {
    expect(trialDaysRemaining(sub({ plan: "pro", trialEndsAt: null }), NOW)).toBeNull();
    expect(trialDaysRemaining(null, NOW)).toBeNull();
  });
});

describe("period helpers", () => {
  it("ends a trial TRIAL_DAYS after registration", () => {
    expect(trialEndFrom(NOW).getTime() - NOW.getTime()).toBe(TRIAL_DAYS * 86_400_000);
  });

  it("grants a paid period of 30 days", () => {
    expect(proPeriodEndFrom(NOW).getTime() - NOW.getTime()).toBe(30 * 86_400_000);
  });

  it("produces a trial that resolves as active immediately after creation", () => {
    expect(resolvePlan(sub({ trialEndsAt: trialEndFrom(NOW) }), NOW)).toBe("trial");
  });
});

describe("checkLimit", () => {
  it("allows below the limit", () => {
    expect(checkLimit("trial", "invoices", { used: 24, limit: 25 })).toEqual({ allowed: true, reason: null });
  });

  it("blocks at the limit, not one past it", () => {
    expect(checkLimit("trial", "invoices", { used: 25, limit: 25 }).allowed).toBe(false);
  });

  it("treats a null limit as unlimited", () => {
    expect(checkLimit("pro", "invoices", { used: 10_000, limit: null })).toEqual({ allowed: true, reason: null });
  });

  // Failing closed here would lock a paying customer out of their own product
  // because one request did not land. The server still returns 402 if they are
  // genuinely over.
  it("fails open on an unknown plan or missing usage", () => {
    expect(checkLimit(null, "seats", { used: 9, limit: 2 })).toEqual({ allowed: true, reason: null });
    expect(checkLimit("trial", "seats", null)).toEqual({ allowed: true, reason: null });
  });

  it("names the limit it hit", () => {
    expect(checkLimit("trial", "branches", { used: 1, limit: 1 }).reason).toContain("1 branches");
    expect(checkLimit("trial", "seats", { used: 2, limit: 2 }).reason).toContain("2 team members");
  });

  it("says the trial ended rather than quoting a limit of zero", () => {
    const r = checkLimit("expired", "invoices", { used: 0, limit: 0 });
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain("trial has ended");
    expect(r.reason).not.toContain("0 invoices");
  });

  it("always offers a way forward when it blocks", () => {
    (["invoices", "branches", "seats"] as const).forEach((kind) => {
      expect(checkLimit("trial", kind, { used: 1, limit: 1 }).reason).toContain("Upgrade");
    });
  });
});
