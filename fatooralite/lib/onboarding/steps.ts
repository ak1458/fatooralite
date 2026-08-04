"use client";

import { BUSINESS_CATEGORIES } from "@/lib/constants/business-categories";

export type OnboardingStepKey =
  | "business-identity"
  | "tax-registration"
  | "address-contact"
  | "zatca-connection"
  | "branches"
  | "finish";

export interface OnboardingStepConfig {
  key: OnboardingStepKey;
  label: string;
  description: string;
  icon?: React.ReactNode;
  /** Fields this step collects — used for validation gating */
  fields: string[];
  /** Schema key for validation (matches schemas.ts exports) */
  validationSchema?: "zatcaMandatoryCompanySchema" | "updateCompanySchema" | "patchCompanySchema";
  /** Whether this step can be skipped */
  optional?: boolean;
  /** Step order (0-indexed) */
  order: number;
  /** Help topic slug for documentation links */
  helpTopic?: string;
}

/** Registry of all onboarding steps — single source of truth for wizard structure */
export const ONBOARDING_STEPS: readonly OnboardingStepConfig[] = [
  {
    key: "business-identity",
    label: "Business identity",
    description: "Legal name, category, and commercial registration",
    fields: [
      "name",
      "nameAr",
      "businessCategory",
      "businessCategoryOther",
      "crNumber",
      "crType",
      "crIssueDate",
      "crIssuePlace",
    ],
    validationSchema: "zatcaMandatoryCompanySchema",
    order: 0,
    helpTopic: "business-identity",
  },
  {
    key: "tax-registration",
    label: "Tax registration",
    description: "VAT number, registration date, economic activity, and invoice types",
    fields: [
      "vatNumber",
      "vatRegistrationDate",
      "economicActivity",
      "invoiceTypes",
    ],
    validationSchema: "zatcaMandatoryCompanySchema",
    order: 1,
    helpTopic: "tax-registration",
  },
  {
    key: "address-contact",
    label: "Address & contact",
    description: "Saudi national address and primary contact person",
    fields: [
      "buildingNumber",
      "streetName",
      "streetNameAr",
      "district",
      "districtAr",
      "city",
      "cityAr",
      "postalCode",
      "additionalNumber",
      "province",
      "countryCode",
      "contactName",
      "contactPhone",
      "contactEmail",
    ],
    validationSchema: "zatcaMandatoryCompanySchema",
    order: 2,
    helpTopic: "address-contact",
  },
  {
    key: "zatca-connection",
    label: "ZATCA connection",
    description: "Connect your device to ZATCA for invoice clearance & reporting",
    fields: [],
    optional: true,
    order: 3,
    helpTopic: "zatca-connection",
  },
  {
    key: "branches",
    label: "Branches & locations",
    description: "Add at least one branch — invoices are issued per location",
    fields: [],
    order: 4,
    helpTopic: "branches",
  },
  {
    key: "finish",
    label: "Finish",
    description: "Review and activate your account",
    fields: [],
    order: 5,
    helpTopic: "finish",
  },
] as const;

/** Get step by key */
export function getStep(key: OnboardingStepKey): OnboardingStepConfig | undefined {
  return ONBOARDING_STEPS.find((s) => s.key === key);
}

/** Get step by order index */
export function getStepByOrder(order: number): OnboardingStepConfig | undefined {
  return ONBOARDING_STEPS.find((s) => s.order === order);
}

/** Get all step keys in order */
export function getStepKeys(): OnboardingStepKey[] {
  return ONBOARDING_STEPS.map((s) => s.key);
}

/** Get the next step key after the given one */
export function getNextStep(currentKey: OnboardingStepKey): OnboardingStepKey | null {
  const idx = ONBOARDING_STEPS.findIndex((s) => s.key === currentKey);
  if (idx === -1 || idx >= ONBOARDING_STEPS.length - 1) return null;
  return ONBOARDING_STEPS[idx + 1].key;
}

/** Get the previous step key before the given one */
export function getPrevStep(currentKey: OnboardingStepKey): OnboardingStepKey | null {
  const idx = ONBOARDING_STEPS.findIndex((s) => s.key === currentKey);
  if (idx <= 0) return null;
  return ONBOARDING_STEPS[idx - 1].key;
}

/** Business category options for dropdown */
export const BUSINESS_CATEGORY_OPTIONS = BUSINESS_CATEGORIES.map((c) => ({
  value: c.code,
  labelEn: c.labelEn,
  labelAr: c.labelAr,
}));

/** CR type options per ZATCA PartyIdentification scheme */
export const CR_TYPE_OPTIONS = [
  { value: "CRN", label: "CRN — Commercial Registration Number" },
  { value: "MOM", label: "MOM — Ministry of Municipalities" },
  { value: "MLS", label: "MLS — Ministry of Labor & Social Development" },
  { value: "SAG", label: "SAG — Saudi Arabian General Investment Authority" },
  { value: "700", label: "700 — Other government entity" },
  { value: "OTH", label: "OTH — Other" },
] as const;

/** Invoice type options */
export const INVOICE_TYPES_OPTIONS = [
  { value: "standard", label: "Standard only" },
  { value: "simplified", label: "Simplified only" },
  { value: "both", label: "Both standard and simplified" },
] as const;