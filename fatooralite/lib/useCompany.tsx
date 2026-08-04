"use client";
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

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

  const refresh = useCallback(async () => {
    try {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setUser(me?.user ?? null);
      setCompanyState(me?.company ?? null);

      if (me?.company?.id) {
        const data = await fetch(`/api/branches?companyId=${me.company.id}`)
          .then((r) => r.json())
          .catch(() => ({ branches: [] }));
        const list: Branch[] = data.branches ?? [];
        setBranches(list);
        const stored = typeof window !== "undefined" ? localStorage.getItem("fl-active-branch") : null;
        const valid = list.find((b) => b.id === stored);
        setActiveBranchId(valid?.id ?? list[0]?.id ?? null);
      } else {
        setBranches([]);
        setActiveBranchId(null);
      }
    } catch {
      setUser(null);
      setCompanyState(null);
      setBranches([]);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    refresh().finally(() => setIsLoading(false));
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

/** Branch (location) selection for the active company. */
export function useBranch() {
  const c = useContext(AppContext);
  return { branches: c.branches, activeBranch: c.activeBranch, setActiveBranch: c.setActiveBranch };
}
