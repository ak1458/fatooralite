import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlanGate } from "./PlanGate";
import type { PlanState } from "@/lib/useCompany";
import { checkLimit, type LimitKind } from "@/lib/billing/entitlements";

const usePlanMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/useCompany", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/useCompany")>()),
  usePlan: usePlanMock,
}));

/**
 * Only the context read is stubbed; `check` delegates to the real predicate in
 * lib/billing/entitlements.ts, exactly as usePlan() does. A copy of the rule
 * here would keep passing after the real one broke.
 */
function withPlan(plan: PlanState | null) {
  usePlanMock.mockReturnValue({
    plan,
    isPro: plan?.plan === "pro",
    check: (kind: LimitKind) => checkLimit(plan?.plan ?? null, kind, plan?.[kind] ?? null),
  });
}

const state = (over: Partial<PlanState> = {}): PlanState => ({
  plan: "trial",
  trialDaysLeft: 5,
  trialEndsAt: null,
  invoices: { used: 3, limit: 25 },
  branches: { used: 1, limit: 1 },
  seats: { used: 1, limit: 2 },
  ...over,
});

const Button = ({ disabled }: { disabled: boolean }) => (
  <button disabled={disabled}>Create invoice</button>
);

afterEach(() => usePlanMock.mockReset());

describe("PlanGate", () => {
  it("enables the action below the limit and shows no reason", () => {
    withPlan(state());
    render(<PlanGate limit="invoices">{({ disabled }) => <Button disabled={disabled} />}</PlanGate>);
    expect(screen.getByRole("button")).toBeEnabled();
    expect(screen.queryByText(/Upgrade/)).not.toBeInTheDocument();
  });

  it("disables at the limit and explains why, before the click", () => {
    withPlan(state({ invoices: { used: 25, limit: 25 } }));
    render(<PlanGate limit="invoices">{({ disabled }) => <Button disabled={disabled} />}</PlanGate>);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByText(/Trial limit reached — 25 invoices this month/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upgrade" })).toHaveAttribute("href", "/settings?tab=billing");
  });

  it("says the trial ended rather than quoting a limit once expired", () => {
    withPlan(state({ plan: "expired", invoices: { used: 0, limit: 0 } }));
    render(<PlanGate limit="invoices">{({ disabled }) => <Button disabled={disabled} />}</PlanGate>);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByText(/trial has ended/i)).toBeInTheDocument();
  });

  it("never disables anything on Pro", () => {
    withPlan(state({ plan: "pro", invoices: { used: 9999, limit: null }, branches: { used: 40, limit: null }, seats: { used: 12, limit: null } }));
    (["invoices", "branches", "seats"] as const).forEach((limit) => {
      const { unmount } = render(<PlanGate limit={limit}>{({ disabled }) => <Button disabled={disabled} />}</PlanGate>);
      expect(screen.getByRole("button")).toBeEnabled();
      unmount();
    });
  });

  // The property that matters most: a failed or in-flight plan read must not
  // block a legitimate action. The server returns 402 if it is genuinely over
  // the limit, so failing open costs a round trip; failing closed would lock a
  // paying customer out of their own product on a flaky request.
  it("fails open while the plan is unknown", () => {
    withPlan(null);
    render(<PlanGate limit="seats">{({ disabled }) => <Button disabled={disabled} />}</PlanGate>);
    expect(screen.getByRole("button")).toBeEnabled();
    expect(screen.queryByText(/Upgrade/)).not.toBeInTheDocument();
  });

  it("gates each limit independently", () => {
    withPlan(state({ seats: { used: 2, limit: 2 }, invoices: { used: 1, limit: 25 } }));
    const { unmount } = render(<PlanGate limit="seats">{({ disabled }) => <Button disabled={disabled} />}</PlanGate>);
    expect(screen.getByRole("button")).toBeDisabled();
    unmount();
    render(<PlanGate limit="invoices">{({ disabled }) => <Button disabled={disabled} />}</PlanGate>);
    expect(screen.getByRole("button")).toBeEnabled();
  });
});
