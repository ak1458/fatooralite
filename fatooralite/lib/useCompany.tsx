"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Company {
  id: string;
  name: string;
  nameAr: string | null;
  vatNumber: string;
}

interface CompanyContextType {
  company: Company | null;
  companies: Company[];
  setCompany: (id: string) => void;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType>({
  company: null,
  companies: [],
  setCompany: () => {},
  isLoading: true,
});

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => {
        if (data.companies && data.companies.length > 0) {
          setCompanies(data.companies);
          
          // Check local storage for previously selected company
          const stored = localStorage.getItem("fl-active-company");
          if (stored && data.companies.some((c: Company) => c.id === stored)) {
            setActiveId(stored);
          } else {
            // Default to first company
            setActiveId(data.companies[0].id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const setCompany = (id: string) => {
    if (companies.some((c) => c.id === id)) {
      setActiveId(id);
      localStorage.setItem("fl-active-company", id);
      
      // Optionally reload the page to refresh all data hooks
      // window.location.reload(); 
    }
  };

  const activeCompany = companies.find((c) => c.id === activeId) || null;

  return (
    <CompanyContext.Provider value={{ company: activeCompany, companies, setCompany, isLoading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
