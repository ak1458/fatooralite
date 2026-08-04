import { describe, it, expect } from "vitest";
import { updateCompanySchema, patchCompanySchema, zatcaMandatoryCompanySchema, checkOnboardingCompletion } from "./schemas";

const fullProfile = {
  name: "Acme Trading",
  vatNumber: "300000000000003",
  crNumber: "1010000001",
  businessCategory: "retail",
  crType: "CRN",
  crIssueDate: "2020-01-15",
  vatRegistrationDate: "2020-02-01",
  economicActivity: "General retail trade",
  buildingNumber: "1234",
  streetName: "King Fahd Road",
  district: "Al Olaya",
  city: "Riyadh",
  postalCode: "12345",
  additionalNumber: "6789",
  contactName: "Sara Ahmed",
  contactPhone: "+966501234567",
  contactEmail: "sara@acme.example",
  invoiceTypes: "both",
};

describe("zatcaMandatoryCompanySchema", () => {
  it("accepts a fully completed business profile", () => {
    expect(zatcaMandatoryCompanySchema.safeParse(fullProfile).success).toBe(true);
  });

  it("rejects a missing business category", () => {
    const { businessCategory: _drop, ...rest } = fullProfile;
    expect(zatcaMandatoryCompanySchema.safeParse(rest).success).toBe(false);
  });

  it('requires businessCategoryOther when businessCategory is "other"', () => {
    const result = zatcaMandatoryCompanySchema.safeParse({ ...fullProfile, businessCategory: "other" });
    expect(result.success).toBe(false);
  });

  it('accepts "other" when businessCategoryOther is provided', () => {
    const result = zatcaMandatoryCompanySchema.safeParse({
      ...fullProfile,
      businessCategory: "other",
      businessCategoryOther: "Artisan candle making",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unrecognized business category code", () => {
    expect(zatcaMandatoryCompanySchema.safeParse({ ...fullProfile, businessCategory: "space_travel" }).success).toBe(false);
  });

  it("rejects a CR number that isn't 10 digits", () => {
    expect(zatcaMandatoryCompanySchema.safeParse({ ...fullProfile, crNumber: "123" }).success).toBe(false);
  });

  it("rejects a building number that isn't 4 digits", () => {
    expect(zatcaMandatoryCompanySchema.safeParse({ ...fullProfile, buildingNumber: "12" }).success).toBe(false);
  });

  it("rejects a postal code that isn't 5 digits", () => {
    expect(zatcaMandatoryCompanySchema.safeParse({ ...fullProfile, postalCode: "123" }).success).toBe(false);
  });

  it("rejects a malformed date", () => {
    expect(zatcaMandatoryCompanySchema.safeParse({ ...fullProfile, crIssueDate: "15-01-2020" }).success).toBe(false);
  });

  it("rejects an invalid contact email", () => {
    expect(zatcaMandatoryCompanySchema.safeParse({ ...fullProfile, contactEmail: "not-an-email" }).success).toBe(false);
  });
});

describe("updateCompanySchema (PUT /api/companies/[id])", () => {
  it("still accepts the legacy minimal profile (no new fields filled in yet)", () => {
    expect(
      updateCompanySchema.safeParse({
        name: "Acme Trading",
        nameAr: "",
        vatNumber: "300000000000003",
        crNumber: "",
        address: "",
      }).success,
    ).toBe(true);
  });

  it("accepts a full profile update", () => {
    expect(updateCompanySchema.safeParse(fullProfile).success).toBe(true);
  });

  it('rejects businessCategory "other" without free text', () => {
    expect(updateCompanySchema.safeParse({ ...fullProfile, businessCategory: "other" }).success).toBe(false);
  });

  it("rejects an IBAN that isn't SA + 22 digits", () => {
    expect(updateCompanySchema.safeParse({ ...fullProfile, iban: "GB29NWBK60161331926819" }).success).toBe(false);
  });
});

describe("patchCompanySchema (PATCH /api/companies/[id])", () => {
  it("accepts an onboarding-step patch with no profile fields", () => {
    expect(patchCompanySchema.safeParse({ onboardingStep: 1, onboardingStatus: "in_progress" }).success).toBe(true);
  });

  it("accepts a partial profile patch", () => {
    expect(patchCompanySchema.safeParse({ businessCategory: "healthcare", city: "Jeddah" }).success).toBe(true);
  });

  it("rejects an empty object with an unknown field left out (sanity: partial is genuinely partial)", () => {
    expect(patchCompanySchema.safeParse({}).success).toBe(true);
  });
});

describe("checkOnboardingCompletion (the actual PATCH /api/companies/[id] completion guard)", () => {
  // Regression coverage for the onboarding-completion-bypass fix: the wizard's
  // deep-link + this guard together were supposed to stop a company reaching
  // onboardingStatus:"complete" without ever providing the ZATCA-mandatory
  // fields. This suite exercises the actual merge-then-validate logic the
  // route runs (existing DB row + incoming patch), not just the schema alone.

  it("rejects completing onboarding from a brand-new company with only name/vatNumber (the exploit this fix closes)", () => {
    // A freshly registered company — exactly what a direct API call bypassing
    // the wizard would have, before this fix, been able to mark "complete".
    const freshlyRegistered = { name: "Acme Trading", vatNumber: "300000000000003" };
    const result = checkOnboardingCompletion(freshlyRegistered, { onboardingStatus: "complete" });
    expect(result.ok).toBe(false);
  });

  it("accepts completing onboarding once every mandatory field is present across existing + patch", () => {
    // Simulates the real wizard flow: earlier steps already saved fields to
    // the DB (existing), and the final step's patch supplies the rest plus
    // onboardingStatus: "complete".
    const existing = {
      name: "Acme Trading",
      vatNumber: "300000000000003",
      businessCategory: "retail",
      crNumber: "1010000001",
      crType: "CRN",
      crIssueDate: "2020-01-15",
      vatRegistrationDate: "2020-02-01",
      economicActivity: "General retail trade",
    };
    const finalStepPatch = {
      onboardingStatus: "complete",
      buildingNumber: "1234",
      streetName: "King Fahd Road",
      district: "Al Olaya",
      city: "Riyadh",
      postalCode: "12345",
      additionalNumber: "6789",
      contactName: "Sara Ahmed",
      contactPhone: "+966501234567",
      contactEmail: "sara@acme.example",
      invoiceTypes: "both",
    };
    expect(checkOnboardingCompletion(existing, finalStepPatch).ok).toBe(true);
  });

  it("rejects when one mandatory field is missing even if everything else is present", () => {
    const existing = {
      name: "Acme Trading",
      vatNumber: "300000000000003",
      businessCategory: "retail",
      crNumber: "1010000001",
      crType: "CRN",
      crIssueDate: "2020-01-15",
      vatRegistrationDate: "2020-02-01",
      economicActivity: "General retail trade",
      buildingNumber: "1234",
      streetName: "King Fahd Road",
      district: "Al Olaya",
      city: "Riyadh",
      postalCode: "12345",
      additionalNumber: "6789",
      contactName: "Sara Ahmed",
      contactPhone: "+966501234567",
      // contactEmail intentionally missing
      invoiceTypes: "both",
    };
    const result = checkOnboardingCompletion(existing, { onboardingStatus: "complete" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.path).toBe("contactEmail");
  });

  it("does not gate a patch that isn't trying to complete onboarding, even with an incomplete profile", () => {
    const freshlyRegistered = { name: "Acme Trading", vatNumber: "300000000000003" };
    // No onboardingStatus in the patch at all — this is just a normal partial
    // save mid-wizard and must never be blocked by the completion guard.
    const result = checkOnboardingCompletion(freshlyRegistered, { businessCategory: "retail" });
    expect(result.ok).toBe(true);
  });
});
