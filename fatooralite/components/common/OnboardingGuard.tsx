"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useCompany";

/**
 * Sends users whose company hasn't finished onboarding to the wizard. The app
 * modules are not usable until onboarding is complete.
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { company, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || !company) return;
    if (company.onboardingStatus && company.onboardingStatus !== "complete" && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [company, isLoading, pathname, router]);

  return <>{children}</>;
}
