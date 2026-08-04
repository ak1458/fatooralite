"use client";

import { BUSINESS_CATEGORY_OPTIONS, INVOICE_TYPES_OPTIONS } from "@/lib/onboarding/steps";
import { StepNav } from "../StepNav";
import { StepTitle, SummaryRow } from "../WizardChrome";
import type { Branch, Company } from "../types";

interface FinishStepProps {
  company: Company;
  branches: Branch[];
  busy: boolean;
  onBack: () => void;
  onFinish: () => void;
}

export function FinishStep({ company, branches, busy, onBack, onFinish }: FinishStepProps) {
  const categoryLabel = company.businessCategory
    ? BUSINESS_CATEGORY_OPTIONS.find((c) => c.value === company.businessCategory)?.labelEn ?? company.businessCategory
    : "—";
  const invoiceTypesLabel = company.invoiceTypes
    ? INVOICE_TYPES_OPTIONS.find((o) => o.value === company.invoiceTypes)?.label ?? company.invoiceTypes
    : "—";

  return (
    <div>
      <StepTitle title="You're ready" sub="Review and enter your dashboard." />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        <SummaryRow k="Company" v={company.name} />
        <SummaryRow k="VAT number" v={company.vatNumber} />
        <SummaryRow k="Business category" v={categoryLabel} />
        <SummaryRow k="Invoice types" v={invoiceTypesLabel} />
        <SummaryRow k="Locations" v={branches.map((b) => b.name).join(", ") || "—"} />
      </div>
      <StepNav
        onBack={onBack}
        onNext={onFinish}
        busy={busy}
        nextLabel={busy ? "Finishing…" : "Go to dashboard"}
      />
    </div>
  );
}
