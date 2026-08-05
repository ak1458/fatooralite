"use client";
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { checkLimit, type LimitKind } from "@/lib/billing/entitlements";

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  role: string;
  companyId?: string;
}

export interface Company {
  id: string;
  name: string;
  nameAr: string | null;
  vatNumber: string;
  crNumber?: string | null;
  address?: string | null;
  // ZATCA/business-profile fields — see prisma/schema.prisma Company model
  // and lib/validation/schemas.ts for the source of truth on shape/validation.
  businessCategory?: string | null;
  businessCategoryOther?: string | null;
  crType?: string | null;
  crIssueDate?: string | null;
  crIssuePlace?: string | null;
  vatRegistrationDate?: string | null;
  economicActivity?: string | null;
  buildingNumber?: string | null;
  streetName?: string | null;
  streetNameAr?: string | null;
  district?: string | null;
  districtAr?: string | null;
  city?: string | null;
  cityAr?: string | null;
  postalCode?: string | null;
  additionalNumber?: string | null;
  province?: string | null;
  countryCode?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  invoiceTypes?: string | null;
  iban?: string | null;
  bankName?: string | null;
  onboardingStatus?: string;
  onboardingStep?: number;
}

export interface Branch {
  id: string;
  name: string;
  nameAr: string | null;
  city: string | null;
}

/** Plan + usage, resolved server-side. The UI never infers entitlement from
 *  the raw subscription row — lib/billing/entitlements.ts is the only
 *  authority, and this is a read of what it decided. */
export interface PlanUsage {
  used: number;
  /** null means unlimited. */
  limit: number | null;
}

export interface PlanState {
  plan: "trial" | "pro" | "expired";
  trialDaysLeft: number | null;
  trialEndsAt: string | null;
  invoices: PlanUsage;
  branches: PlanUsage;
  seats: PlanUsage;
}

interface AppContextType {
  user: SessionUser | null;
  company: Company | null;
  /** Back-compat for existing consumers; single-tenant so this is [company] or []. */
  companies: Company[];
  setCompany: (id: string) => void;
  branches: Branch[];
  activeBranch: Branch | null;
  setActiveBranch: (id: string) => void;
  isLoading: boolean;
  refresh: () => Promise<void>;
  /** null until loaded, or if the plan endpoint could not be reached. */
  plan: PlanState | null;
}

const AppContext = createContext<AppContextType>({
  user: null,
  company: null,
  companies: [],
  setCompany: () => {},
  branches: [],
  activeBranch: null,
  setActiveBranch: () => {},
  isLoading: true,
  refresh: async () => {},
  plan: null,
});

/**
 * Single source of session truth for the app shell: the logged-in user, their
 * (single) company, and that company's branches/active location. Backed by
 * /api/auth/me so it is tenant-correct — it never lists other tenants.
 */
export function CompanyProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [company, setCompanyState] = useState<Company | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [plan, setPlan] = useState<PlanState | null>(null);

  const refresh = useCallback(async () => {
    try {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setUser(me?.user ?? null);
      setCompanyState(me?.company ?? null);

      if (me?.company?.id) {
        // Branches and plan are independent reads; fetching them together
        // keeps this to one round trip and means every consumer of plan state
        // (the trial banner, the gated buttons) shares a single request rather
        // than each making its own.
        const [data, planRes] = await Promise.all([
          fetch(`/api/branches?companyId=${me.company.id}`)
            .then((r) => r.json())
            .catch(() => ({ branches: [] })),
          fetch(`/api/companies/${me.company.id}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);
        setPlan(
          planRes?.plan
            ? {
                plan: planRes.plan,
                trialDaysLeft: planRes.trialDaysLeft ?? null,
                trialEndsAt: planRes.trialEndsAt ?? null,
                invoices: planRes.invoiceUsage ?? { used: 0, limit: null },
                branches: planRes.branchUsage ?? { used: 0, limit: null },
                seats: planRes.seatUsage ?? { used: 0, limit: null },
              }
            : null,
        );
        const list: Branch[] = data.branches ?? [];
        setBranches(list);
        const stored = typeof window !== "undefined" ? localStorage.getItem("fl-active-branch") : null;
        const valid = list.find((b) => b.id === stored);
        setActiveBranchId(valid?.id ?? list[0]?.id ?? null);
      } else {
        setBranches([]);
        setActiveBranchId(null);
        setPlan(null);
      }
    } catch {
      setUser(null);
      setCompanyState(null);
      setBranches([]);
      setPlan(null);
    }
  }, []);

  useEffect(() => {
    // isLoading starts true (see useState above), so the effect only clears it.
    // Awaited inside an async IIFE rather than chained off .finally() so the
    // update is unambiguously post-await, with a cancellation guard so an
    // unmount mid-flight does not set state on a dead component. refresh()
    // handles its own errors and never rejects.
    let cancelled = false;
    void (async () => {
      await refresh();
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const setActiveBranch = (id: string) => {
    setActiveBranchId(id);
    if (typeof window !== "undefined") localStorage.setItem("fl-active-branch", id);
  };

  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? null;

  return (
    <AppContext.Provider
      value={{
        user,
        company,
        companies: company ? [company] : [],
        setCompany: () => {},
        branches,
        activeBranch,
        setActiveBranch,
        isLoading,
        refresh,
        plan,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

/** Back-compat hook used across pages: the active company + loading flag. */
export function useCompany() {
  const c = useContext(AppContext);
  return { company: c.company, companies: c.companies, setCompany: c.setCompany, isLoading: c.isLoading };
}

/** Session user + company + onboarding state, with a refresh trigger. */
export function useAuth() {
  const c = useContext(AppContext);
  return { user: c.user, company: c.company, isLoading: c.isLoading, refresh: c.refresh };
}

/**
 * Plan and usage for the active company, plus a helper that answers "can this
 * tenant do X right now, and if not, why".
 *
 * The server is still the only authority (lib/billing/plan.ts returns a 402);
 * this exists so a control can say so *before* the click instead of after.
 */
export function usePlan() {
  const { plan } = useContext(AppContext);
  /** Delegates to lib/billing/entitlements.ts so the rule lives in one place. */
  const check = (kind: LimitKind) => checkLimit(plan?.plan ?? null, kind, plan?.[kind] ?? null);
  return { plan, check, isPro: plan?.plan === "pro" };
}

/** Branch (location) selection for the active company. */
export function useBranch() {
  const c = useContext(AppContext);
  return { branches: c.branches, activeBranch: c.activeBranch, setActiveBranch: c.setActiveBranch };
}
