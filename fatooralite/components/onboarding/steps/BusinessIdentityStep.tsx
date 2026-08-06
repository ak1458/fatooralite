"use client";

import { useState } from "react";
import { BUSINESS_CATEGORY_OPTIONS, CR_TYPE_OPTIONS } from "@/lib/onboarding/steps";
import { blankToNull, validateBusinessIdentity } from "@/lib/onboarding/validation";
import { HelpLinks } from "../HelpLink";
import { Field } from "../Field";
import { StepNav } from "../StepNav";
import { StepTitle } from "../WizardChrome";
import { input, monoReadOnlyInput, readOnlyInput, row, section } from "../styles";
import type { StepProps } from "../types";

export function BusinessIdentityStep({ company, busy, onNext, onBack, errors, setErrors }: StepProps) {
  const [nameAr, setNameAr] = useState(company.nameAr ?? "");
  const [crNumber, setCrNumber] = useState(company.crNumber ?? "");
  const [businessCategory, setBusinessCategory] = useState(company.businessCategory ?? "");
  const [businessCategoryOther, setBusinessCategoryOther] = useState(company.businessCategoryOther ?? "");
  const [crType, setCrType] = useState(company.crType ?? "");
  const [crIssueDate, setCrIssueDate] = useState(company.crIssueDate ?? "");
  const [crIssuePlace, setCrIssuePlace] = useState(company.crIssuePlace ?? "");

  const handleNext = () => {
    const data = blankToNull({
      nameAr,
      crNumber,
      businessCategory,
      businessCategoryOther,
      crType,
      crIssueDate,
      crIssuePlace,
    });
    const err = validateBusinessIdentity({ ...data, name: company.name });
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
        title="Business identity"
        sub="Legal name, category, and commercial registration for ZATCA compliance"
        help={<HelpLinks.businessCategory />}
      />

      <div style={section}>
        <Field id="bi-name" label="Legal name (English)" hint="Set during registration — contact support to change">
          {(p) => <input {...p} style={readOnlyInput} value={company.name} readOnly />}
        </Field>
      </div>

      <div style={section}>
        <Field id="bi-name-ar" label="Name (Arabic)" help={<HelpLinks.businessCategory />} error={errors.nameAr}>
          {(p) => (
            <input
              {...p}
              dir="rtl"
              style={input}
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="اسم الشركة بالعربية"
            />
          )}
        </Field>
      </div>

      <div style={section}>
        <Field
          id="bi-vat"
          label="VAT number"
          help={<HelpLinks.vatNumber />}
          hint="Verified during registration"
        >
          {(p) => <input {...p} style={monoReadOnlyInput} value={company.vatNumber} readOnly />}
        </Field>
      </div>

      <div style={row}>
        <Field
          id="bi-category"
          label="Business category"
          required
          help={<HelpLinks.businessCategory />}
          error={errors.businessCategory}
        >
          {(p) => (
            <select
              {...p}
              style={input}
              value={businessCategory}
              onChange={(e) => {
                setBusinessCategory(e.target.value);
                if (e.target.value !== "other") setBusinessCategoryOther("");
              }}
            >
              <option value="">Select category</option>
              {BUSINESS_CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value === "other" ? "Other (specify below)" : c.labelEn}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field id="bi-cr-number" label="CR number" required help={<HelpLinks.crNumber />} error={errors.crNumber}>
          {(p) => (
            <input
              {...p}
              style={input}
              value={crNumber}
              onChange={(e) => setCrNumber(e.target.value)}
              placeholder="1010000001"
              maxLength={10}
              inputMode="numeric"
            />
          )}
        </Field>
      </div>

      {businessCategory === "other" && (
        <div style={section}>
          <Field
            id="bi-category-other"
            label="Describe your business category"
            required
            help={<HelpLinks.businessCategoryOther />}
            error={errors.businessCategoryOther}
          >
            {(p) => (
              <input
                {...p}
                style={input}
                value={businessCategoryOther}
                onChange={(e) => setBusinessCategoryOther(e.target.value)}
                placeholder="E.g., Artisan candle making"
                maxLength={200}
              />
            )}
          </Field>
        </div>
      )}

      <div style={row}>
        <Field id="bi-cr-type" label="CR type" required help={<HelpLinks.crType />} error={errors.crType}>
          {(p) => (
            <select {...p} style={input} value={crType} onChange={(e) => setCrType(e.target.value)}>
              <option value="">Select CR type</option>
              {CR_TYPE_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          id="bi-cr-issue-date"
          label="CR issue date"
          required
          help={<HelpLinks.crIssueDate />}
          error={errors.crIssueDate}
        >
          {(p) => (
            <input
              {...p}
              style={input}
              type="date"
              value={crIssueDate}
              onChange={(e) => setCrIssueDate(e.target.value)}
            />
          )}
        </Field>
      </div>

      <div style={section}>
        {/* Not part of zatcaMandatoryCompanySchema, so it is genuinely optional
            here — it used to carry a required marker the validator never
            enforced, which is worse than either extreme. */}
        <Field
          id="bi-cr-issue-place"
          label="CR issue place"
          help={<HelpLinks.crIssuePlace />}
          error={errors.crIssuePlace}
        >
          {(p) => (
            <input
              {...p}
              style={input}
              value={crIssuePlace}
              onChange={(e) => setCrIssuePlace(e.target.value)}
              placeholder="Riyadh"
              maxLength={100}
            />
          )}
        </Field>
      </div>

      <StepNav onBack={onBack} onNext={handleNext} busy={busy} />
    </div>
  );
}
