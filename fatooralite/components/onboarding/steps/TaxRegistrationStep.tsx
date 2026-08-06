"use client";

import { useState } from "react";
import { INVOICE_TYPES_OPTIONS } from "@/lib/onboarding/steps";
import { blankToNull, validateTaxRegistration } from "@/lib/onboarding/validation";
import { HelpLinks } from "../HelpLink";
import { Field } from "../Field";
import { StepNav } from "../StepNav";
import { StepTitle } from "../WizardChrome";
import { input, monoReadOnlyInput, row, section } from "../styles";
import type { StepProps } from "../types";

export function TaxRegistrationStep({ company, busy, onNext, onBack, errors, setErrors }: StepProps) {
  const [vatRegistrationDate, setVatRegistrationDate] = useState(company.vatRegistrationDate ?? "");
  const [economicActivity, setEconomicActivity] = useState(company.economicActivity ?? "");
  const [invoiceTypes, setInvoiceTypes] = useState(company.invoiceTypes ?? "");

  const handleNext = () => {
    const data = blankToNull({ vatRegistrationDate, economicActivity, invoiceTypes });
    const err = validateTaxRegistration({ ...data, vatNumber: company.vatNumber });
    if (err) {
      setErrors({ [err.field]: err.message });
      return;
    }
    setErrors({});
    onNext(data);
  };

  return (
    <div>
      <StepTitle
        title="Tax registration"
        sub="VAT number, registration date, economic activity, and the invoice types you issue"
        help={<HelpLinks.vatRegistrationDate />}
      />

      <div style={section}>
        <Field
          id="tax-vat"
          label="VAT number"
          help={<HelpLinks.vatNumber />}
          hint="15 digits, verified at registration"
        >
          {(p) => <input {...p} style={monoReadOnlyInput} value={company.vatNumber} readOnly />}
        </Field>
      </div>

      <div style={row}>
        <Field
          id="tax-vat-date"
          label="VAT registration date"
          required
          help={<HelpLinks.vatRegistrationDate />}
          error={errors.vatRegistrationDate}
        >
          {(p) => (
            <input
              {...p}
              style={input}
              type="date"
              value={vatRegistrationDate}
              onChange={(e) => setVatRegistrationDate(e.target.value)}
            />
          )}
        </Field>

        <Field
          id="tax-activity"
          label="Economic activity"
          required
          help={<HelpLinks.economicActivity />}
          error={errors.economicActivity}
        >
          {(p) => (
            <input
              {...p}
              style={input}
              value={economicActivity}
              onChange={(e) => setEconomicActivity(e.target.value)}
              placeholder="General retail trade"
              maxLength={200}
            />
          )}
        </Field>
      </div>

      {/* Required by zatcaMandatoryCompanySchema and therefore by the server's
          onboarding-completion guard, but collected by no step until now —
          every fresh tenant was refused at the final click of the wizard with
          an error no screen could resolve. */}
      <div style={section}>
        <Field
          id="tax-invoice-types"
          label="Invoice types you issue"
          required
          help={<HelpLinks.invoiceTypes />}
          error={errors.invoiceTypes}
          hint="Standard invoices are B2B and must be cleared before you share them. Simplified invoices are B2C and must be reported within 24 hours."
        >
          {(p) => (
            <select {...p} style={input} value={invoiceTypes} onChange={(e) => setInvoiceTypes(e.target.value)}>
              <option value="">Select invoice types</option>
              {INVOICE_TYPES_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <StepNav onBack={onBack} onNext={handleNext} busy={busy} />
    </div>
  );
}
