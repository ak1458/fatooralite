"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getStepKeys, type OnboardingStepKey } from "@/lib/onboarding/steps";
import { Centered, Stepper } from "@/components/onboarding/WizardChrome";
import { BusinessIdentityStep } from "@/components/onboarding/steps/BusinessIdentityStep";
import { TaxRegistrationStep } from "@/components/onboarding/steps/TaxRegistrationStep";
import { AddressContactStep } from "@/components/onboarding/steps/AddressContactStep";
import { ZatcaStep } from "@/components/onboarding/steps/ZatcaStep";
import { BranchesStep } from "@/components/onboarding/steps/BranchesStep";
import { FinishStep } from "@/components/onboarding/steps/FinishStep";
import type { Branch, Company } from "@/components/onboarding/types";

const STEP_KEYS = getStepKeys();

function isStepKey(value: string | null): value is OnboardingStepKey {
  return value !== null && (STEP_KEYS as string[]).includes(value);
}

async function patchCompany(companyId: string, data: Record<string, unknown>): Promise<Company> {
  const res = await fetch(`/api/companies/${companyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Could not save");
  return res.json();
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reopenParam = searchParams.get("reopen");
  const stepParam = searchParams.get("step");

  const [company, setCompany] = useState<Company | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  const loadBranches = useCallback(async (companyId: string) => {
    const d = await fetch(`/api/branches?companyId=${companyId}`)
      .then((r) => r.json())
      .catch(() => ({ branches: [] }));
    setBranches(d.branches ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(async (me) => {
        if (!me?.company) {
          router.replace("/login");
          return;
        }

        let comp: Company = me.company;
        let initialIdx = 0;

        if (reopenParam === "true" || reopenParam === "1") {
          try {
            comp = await patchCompany(me.company.id, { onboardingStatus: "in_progress", onboardingStep: 0 });
          } catch {
            comp = me.company;
          }
          initialIdx = 0;
        } else if (isStepKey(stepParam) && comp.onboardingStatus === "complete") {
          // Deep-link is edit-mode only (Settings -> "Edit this step"). A
          // pending/in_progress company must NOT be able to jump straight to
          // e.g. ?step=finish and mark itself complete without ever passing
          // the validated steps 1-3 — that would skip every ZATCA-mandatory
          // field this wizard exists to collect.
          initialIdx = STEP_KEYS.indexOf(stepParam);
        } else {
          if (comp.onboardingStatus === "complete") {
            router.replace("/dashboard");
            return;
          }
          initialIdx = Math.min(comp.onboardingStep ?? 0, STEP_KEYS.length - 1);
        }

        setCompany(comp);
        setStepIdx(initialIdx);
        await loadBranches(comp.id);
      })
      .finally(() => setLoading(false));
  }, [router, loadBranches, reopenParam, stepParam]);

  const goBack = () => {
    setStepErrors({});
    setError("");
    setStepIdx((i) => Math.max(0, i - 1));
  };

  const advance = async (toIdx: number, extra: Record<string, unknown> = {}) => {
    if (!company) return;
    setBusy(true);
    setError("");
    try {
      const updated = await patchCompany(company.id, {
        onboardingStep: toIdx,
        onboardingStatus: "in_progress",
        ...extra,
      });
      setCompany(updated);
      setStepIdx(toIdx);
      setStepErrors({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!company) return;
    setBusy(true);
    setError("");
    try {
      await fetch("/api/onboarding/local-cert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });
      await patchCompany(company.id, { onboardingStatus: "complete", onboardingStep: STEP_KEYS.length });
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not finish");
      setBusy(false);
    }
  };

  const renderStep = (comp: Company) => {
    const shared = {
      company: comp,
      busy,
      onNext: (d: Record<string, unknown>) => advance(stepIdx + 1, d),
      onBack: goBack,
      errors: stepErrors,
      setErrors: setStepErrors,
    };

    switch (STEP_KEYS[stepIdx]) {
      case "business-identity":
        return <BusinessIdentityStep {...shared} />;
      case "tax-registration":
        return <TaxRegistrationStep {...shared} />;
      case "address-contact":
        return <AddressContactStep {...shared} />;
      case "zatca-connection":
        return (
          <ZatcaStep
            company={comp}
            busy={busy}
            onSkip={() => advance(stepIdx + 1)}
            onConnected={() => advance(stepIdx + 1)}
            setError={setError}
            setBusy={setBusy}
          />
        );
      case "branches":
        return (
          <BranchesStep
            company={comp}
            branches={branches}
            busy={busy}
            reload={() => loadBranches(comp.id)}
            onBack={goBack}
            onNext={() => advance(stepIdx + 1)}
            setError={setError}
          />
        );
      case "finish":
        return (
          <FinishStep company={comp} branches={branches} busy={busy} onBack={goBack} onFinish={finish} />
        );
      default:
        return null;
    }
  };

  if (loading)
    return (
      <Centered>
        <div style={{ color: "var(--t3)" }}>Loading…</div>
      </Centered>
    );
  if (!company) return null;

  return (
    <Centered>
      <div style={{ width: "100%", maxWidth: 720 }}>
        <Stepper currentStepKey={STEP_KEYS[stepIdx]} />
        <div
          style={{
            borderRadius: 18,
            border: "1px solid var(--bd)",
            background: "var(--s1)",
            boxShadow: "var(--sh)",
            padding: 28,
          }}
        >
          {error && (
            <div role="alert" style={{ color: "var(--dang)", fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}
          {renderStep(company)}
        </div>
      </div>
    </Centered>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <Centered>
          <div style={{ color: "var(--t3)" }}>Loading…</div>
        </Centered>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
