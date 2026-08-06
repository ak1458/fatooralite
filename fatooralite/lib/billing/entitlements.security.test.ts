import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FEATURE_LABELS, hasFeature, resolvePlan, type Feature, type PlanId } from "./entitlements";

/**
 * Adversarial tests for the licensing layer.
 *
 * Plan gating added a second authorization axis on top of RBAC and tenant
 * scoping. Every previous Critical bug in this codebase was a guard that
 * short-circuited to *allow* on missing or unexpected data, so these tests
 * push malformed and hostile inputs at the resolver rather than the happy
 * paths entitlements.test.ts already covers.
 */

const NOW = new Date("2026-08-04T12:00:00Z");
const ALL_FEATURES = Object.keys(FEATURE_LABELS) as Feature[];

describe("resolvePlan never fails open", () => {
  // The bug class that produced four Critical findings in this repo: a check
  // that treats "I don't understand this input" as "allow".
  const hostile: Array<[string, unknown]> = [
    ["null", null],
    ["undefined", undefined],
    ["empty object", {}],
    ["plan only", { plan: "pro" }],
    ["status only", { status: "active" }],
    ["numeric plan", { plan: 1, status: "active", trialEndsAt: null, currentPeriodEnd: null }],
    ["array plan", { plan: [], status: "active", trialEndsAt: null, currentPeriodEnd: null }],
    ["object plan", { plan: {}, status: "active", trialEndsAt: null, currentPeriodEnd: null }],
    ["uppercase plan", { plan: "PRO", status: "active", trialEndsAt: null, currentPeriodEnd: null }],
    ["padded plan", { plan: " pro ", status: "active", trialEndsAt: null, currentPeriodEnd: null }],
    ["uppercase status", { plan: "pro", status: "ACTIVE", trialEndsAt: null, currentPeriodEnd: null }],
    ["truthy non-string status", { plan: "pro", status: 1, trialEndsAt: null, currentPeriodEnd: null }],
    ["pro with no status at all", { plan: "pro", trialEndsAt: null, currentPeriodEnd: null }],
    ["trial with no end date", { plan: "trial", status: "active", currentPeriodEnd: null }],
  ];

  it.each(hostile)("resolves %s to a non-privileged plan", (_label, input) => {
    const plan = resolvePlan(input as never, NOW);
    expect(["trial", "expired"]).toContain(plan);
  });

  it("does not grant pro from an invalid trialEndsAt", () => {
    const bad = [NaN, Infinity, -Infinity].map((n) => new Date(n));
    bad.forEach((d) => {
      expect(resolvePlan({ plan: "trial", status: "active", trialEndsAt: d, currentPeriodEnd: null }, NOW)).toBe(
        "expired",
      );
    });
  });

  it("does not extend pro from an invalid currentPeriodEnd", () => {
    // An unparseable date must not be read as "no expiry set".
    expect(
      resolvePlan({ plan: "pro", status: "active", trialEndsAt: null, currentPeriodEnd: new Date(NaN) }, NOW),
    ).toBe("expired");
  });

  it("cannot be pushed to pro by a trial row carrying a period end", () => {
    // Forging currentPeriodEnd onto a trial row must not upgrade it.
    expect(
      resolvePlan(
        { plan: "trial", status: "active", trialEndsAt: new Date(NOW.getTime() - 1), currentPeriodEnd: new Date("2099-01-01") },
        NOW,
      ),
    ).toBe("expired");
  });

  it("only ever returns one of the three known plans", () => {
    const plans = new Set<PlanId>();
    hostile.forEach(([, input]) => plans.add(resolvePlan(input as never, NOW)));
    plans.forEach((p) => expect(["trial", "pro", "expired"]).toContain(p));
  });
});

describe("hasFeature never fails open", () => {
  it("denies every feature for an unknown plan value", () => {
    ALL_FEATURES.forEach((f) => expect(hasFeature("enterprise" as PlanId, f)).toBe(false));
  });

  it("denies an unknown feature name on every plan except pro", () => {
    // Pro is unconditionally true by design; the others must not be.
    expect(hasFeature("trial", "somethingNew" as Feature)).toBe(false);
    expect(hasFeature("expired", "somethingNew" as Feature)).toBe(false);
  });

  it("grants an expired tenant nothing at all", () => {
    ALL_FEATURES.forEach((f) => expect(hasFeature("expired", f)).toBe(false));
  });

  it("does not leak entitlement through inherited Object keys", () => {
    // TRIAL_FEATURES is a Set, so this is already safe — the test pins that
    // it stays a Set rather than becoming a plain-object lookup, where
    // hasFeature("trial", "toString") would be truthy.
    ["toString", "constructor", "hasOwnProperty", "valueOf"].forEach((k) => {
      expect(hasFeature("trial", k as Feature)).toBe(false);
    });
  });
});

describe("every write path that consumes a plan limit is gated", () => {
  // A structural check rather than an integration test: the failure mode this
  // guards against is someone adding a creation route and forgetting the gate,
  // which no unit test of existing routes can catch.
  const app = join(process.cwd(), "app");

  function source(...parts: string[]): string {
    return readFileSync(join(app, ...parts), "utf8");
  }

  it.each([
    ["api/invoices/route.ts", "checkInvoiceLimit"],
    ["api/branches/route.ts", "checkBranchLimit"],
    ["api/users/route.ts", "checkSeatLimit"],
  ])("%s calls %s", (file, gate) => {
    expect(source(...file.split("/"))).toContain(gate);
  });

  it("gates the invoice route on entitlement as well as volume", () => {
    expect(source("api", "invoices", "route.ts")).toContain('requireFeature(companyId, "issueInvoice")');
  });

  it("checks the caller's tenant before consulting their plan", () => {
    // Order matters: resolving a plan for an unverified companyId would leak
    // another tenant's billing state through the 402 body.
    const src = source("api", "invoices", "route.ts");
    expect(src.indexOf("requirePermission")).toBeLessThan(src.indexOf("requireFeature"));
  });

  it("never writes an entitlement-bearing field from the checkout route", () => {
    // Starting a checkout must not change entitlement in either direction —
    // only a verified webhook grants Pro.
    const src = source("api", "billing", "checkout", "route.ts");
    const update = src.slice(src.indexOf("update: { processorSubscriptionId"));
    expect(update.slice(0, 80)).not.toContain('plan: "pro"');
    expect(src).not.toContain('plan: "free"');
  });
});
