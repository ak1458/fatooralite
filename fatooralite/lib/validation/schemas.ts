import { z } from "zod";
import { BUSINESS_CATEGORY_CODES } from "@/lib/constants/business-categories";

// --- Auth ---
export const registerSchema = z.object({
  name: z.string().min(1, "Your name is required").max(100),
  email: z.string().email("Enter a valid email").max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  companyName: z.string().min(1, "Company name is required").max(100),
  vatNumber: z
    .string()
    .length(15, "VAT must be exactly 15 digits")
    .regex(/^[0-9]+$/, "VAT must contain only digits"),
  acceptedTerms: z.literal(true, {
    error: "You must accept the Terms of Service and Privacy Policy",
  }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const inviteUserSchema = z.object({
  email: z.string().email("Enter a valid email").max(200),
  name: z.string().min(1, "Name is required").max(100),
  role: z.string().min(1),
  title: z.string().max(100).optional().nullable(),
  password: z.string().min(8).max(200).optional(),
});

export const updateUserSchema = z.object({
  role: z.string().min(1).optional(),
  roleId: z.string().min(1).nullable().optional(),
  title: z.string().max(100).nullable().optional(),
  status: z.enum(["active", "invited", "disabled"]).optional(),
});

// --- Companies ---

/** Accepts "" (field left blank in an existing form) alongside a real 10-digit CR number. */
const crNumberField = z
  .union([z.literal(""), z.string().regex(/^\d{10}$/, "CR number is 10 digits")])
  .optional()
  .nullable();

/**
 * ZATCA/business-profile fields collected by the onboarding wizard's
 * business-info step. Optional at the field level everywhere they're used
 * for partial updates (Settings, onboarding step patches) — required-ness
 * for *completing* onboarding is enforced separately by
 * zatcaMandatoryCompanySchema below.
 */
const companyProfileFields = {
  businessCategory: z.enum(BUSINESS_CATEGORY_CODES).optional().nullable(),
  businessCategoryOther: z.string().max(200).optional().nullable(),
  crType: z.enum(["CRN", "MOM", "MLS", "SAG", "700", "OTH"]).optional().nullable(),
  crIssueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional().nullable(),
  crIssuePlace: z.string().max(100).optional().nullable(),
  vatRegistrationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional().nullable(),
  economicActivity: z.string().max(200).optional().nullable(),
  buildingNumber: z.string().regex(/^\d{4}$/, "Building number is 4 digits").optional().nullable(),
  streetName: z.string().max(150).optional().nullable(),
  streetNameAr: z.string().max(150).optional().nullable(),
  district: z.string().max(100).optional().nullable(),
  districtAr: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  cityAr: z.string().max(100).optional().nullable(),
  postalCode: z.string().regex(/^\d{5}$/, "Postal code is 5 digits").optional().nullable(),
  additionalNumber: z.string().regex(/^\d{4}$/, "Additional number is 4 digits").optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  countryCode: z.literal("SA").optional().nullable(),
  contactName: z.string().max(100).optional().nullable(),
  contactPhone: z.string().regex(/^\+?\d{7,15}$/, "Enter a valid phone number").optional().nullable(),
  contactEmail: z.string().email("Enter a valid email").max(200).optional().nullable(),
  invoiceTypes: z.enum(["standard", "simplified", "both"]).optional().nullable(),
  iban: z.string().regex(/^SA\d{22}$/, "IBAN must be SA followed by 22 digits").optional().nullable(),
  bankName: z.string().max(100).optional().nullable(),
};

/** Rejects businessCategory "other" without a free-text description. */
function requireOtherCategoryDetail(
  data: { businessCategory?: string | null; businessCategoryOther?: string | null },
  ctx: z.RefinementCtx,
) {
  if (data.businessCategory === "other" && !data.businessCategoryOther?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["businessCategoryOther"],
      message: 'Describe the business category when selecting "Other"',
    });
  }
}

export const updateCompanySchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    nameAr: z.string().max(100).optional().nullable(),
    vatNumber: z.string().length(15, "VAT must be exactly 15 digits").regex(/^[0-9]+$/, "VAT must contain only digits"),
    crNumber: crNumberField,
    address: z.string().max(500).optional().nullable(),
    ...companyProfileFields,
  })
  .superRefine(requireOtherCategoryDetail);

/** Partial company update — PATCH /api/companies/[id] (Settings, onboarding step patches). */
export const patchCompanySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    nameAr: z.string().max(100).nullable().optional(),
    crNumber: crNumberField,
    address: z.string().max(500).nullable().optional(),
    onboardingStatus: z.enum(["pending", "in_progress", "complete"]).optional(),
    onboardingStep: z.number().int().min(0).max(10).optional(),
    ...companyProfileFields,
  })
  .superRefine(requireOtherCategoryDetail);

/**
 * The full ZATCA-mandatory subset, fields required rather than optional. Not
 * used for partial PATCH/PUT calls — this is what the onboarding wizard's
 * business-info step validates a company's profile against before allowing
 * the user to advance past it (roadmap §4 step 1).
 */
const zatcaMandatoryFields = {
  name: z.string().min(1, "Name is required").max(100),
  vatNumber: z.string().length(15, "VAT must be exactly 15 digits").regex(/^[0-9]+$/, "VAT must contain only digits"),
  businessCategory: z.enum(BUSINESS_CATEGORY_CODES, { message: "Select a business category" }),
  businessCategoryOther: z.string().max(200).optional().nullable(),
  crNumber: z.string().regex(/^\d{10}$/, "CR number is 10 digits"),
  crType: z.enum(["CRN", "MOM", "MLS", "SAG", "700", "OTH"], { message: "Select a CR type" }),
  crIssueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  vatRegistrationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  economicActivity: z.string().min(1, "Economic activity is required").max(200),
  buildingNumber: z.string().regex(/^\d{4}$/, "Building number is 4 digits"),
  streetName: z.string().min(1, "Street is required").max(150),
  district: z.string().min(1, "District is required").max(100),
  city: z.string().min(1, "City is required").max(100),
  postalCode: z.string().regex(/^\d{5}$/, "Postal code is 5 digits"),
  additionalNumber: z.string().regex(/^\d{4}$/, "Additional number is 4 digits"),
  contactName: z.string().min(1, "Contact name is required").max(100),
  contactPhone: z.string().regex(/^\+?\d{7,15}$/, "Enter a valid phone number"),
  contactEmail: z.string().email("Enter a valid email").max(200),
  invoiceTypes: z.enum(["standard", "simplified", "both"], { message: "Select which invoice types you issue" }),
} as const;

export const zatcaMandatoryCompanySchema = z
  .object(zatcaMandatoryFields)
  .superRefine(requireOtherCategoryDetail);

/**
 * Per-step slices of the same field definitions the completion guard uses.
 *
 * The wizard validates a step against its slice before advancing, and
 * `checkOnboardingCompletion` validates the merged company against the whole
 * object at the end. Both read from `zatcaMandatoryFields`, so a rule can
 * never be stricter in one place than the other — the failure mode otherwise
 * is a tenant clearing every step and then being refused at the last click
 * with an error no screen can fix.
 *
 * `name` and `vatNumber` are set at registration and rendered read-only, but
 * they stay in their step's slice so the step still fails loudly if a company
 * somehow reaches the wizard without them.
 */
export const businessIdentityStepSchema = z
  .object({
    name: zatcaMandatoryFields.name,
    businessCategory: zatcaMandatoryFields.businessCategory,
    businessCategoryOther: zatcaMandatoryFields.businessCategoryOther,
    crNumber: zatcaMandatoryFields.crNumber,
    crType: zatcaMandatoryFields.crType,
    crIssueDate: zatcaMandatoryFields.crIssueDate,
  })
  .superRefine(requireOtherCategoryDetail);

export const taxRegistrationStepSchema = z.object({
  vatNumber: zatcaMandatoryFields.vatNumber,
  vatRegistrationDate: zatcaMandatoryFields.vatRegistrationDate,
  economicActivity: zatcaMandatoryFields.economicActivity,
  invoiceTypes: zatcaMandatoryFields.invoiceTypes,
});

export const addressContactStepSchema = z.object({
  buildingNumber: zatcaMandatoryFields.buildingNumber,
  additionalNumber: zatcaMandatoryFields.additionalNumber,
  streetName: zatcaMandatoryFields.streetName,
  district: zatcaMandatoryFields.district,
  city: zatcaMandatoryFields.city,
  postalCode: zatcaMandatoryFields.postalCode,
  contactName: zatcaMandatoryFields.contactName,
  contactPhone: zatcaMandatoryFields.contactPhone,
  contactEmail: zatcaMandatoryFields.contactEmail,
});

/**
 * The actual completion guard used by `PATCH /api/companies/[id]`: only when
 * `patch.onboardingStatus === "complete"`, merges a company's existing saved
 * fields with the incoming patch and checks whether the RESULT satisfies
 * `zatcaMandatoryCompanySchema`. A no-op (`ok: true`) for any patch that
 * isn't attempting the "complete" transition — a normal mid-wizard partial
 * save must never be blocked by this. Pulled out as a pure function (no
 * Prisma/HTTP) so the merge-then-validate behavior — the real bug surface
 * the onboarding-completion-bypass fix targeted — is directly unit-testable
 * without a database. Returns the first validation issue's path/message on
 * failure, matching the route's error response shape.
 */
export function checkOnboardingCompletion(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
): { ok: true } | { ok: false; path: string; message: string } {
  if (patch.onboardingStatus !== "complete") return { ok: true };
  const merged = { ...existing, ...patch };
  const result = zatcaMandatoryCompanySchema.safeParse(merged);
  if (result.success) return { ok: true };
  const issue = result.error.issues[0];
  return { ok: false, path: issue?.path.join(".") ?? "", message: issue?.message ?? "Invalid input" };
}

// --- Customers ---
export const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  nameAr: z.string().max(100).optional().nullable(),
  vatNumber: z.string().length(15).regex(/^[0-9]+$/).optional().nullable(),
  crNumber: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().max(200).optional().nullable().or(z.literal("")),
});

// --- Products ---
export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  sku: z.string().max(50).optional().nullable(),
  unitPrice: z.number().min(0, "Price cannot be negative"),
  vatCategory: z.enum(["S", "Z", "E", "O"]).default("S"),
});

// --- Invoices ---
export const createInvoiceSchema = z.object({
  // Optional: when omitted the server assigns the next sequential number
  // (INV-YYYY-NNNNN) from the per-company counter.
  invoiceNumber: z.string().min(1).max(60).optional(),
  kind: z.enum(["standard", "simplified"]),
  documentType: z.enum(["invoice", "credit", "debit"]).optional().default("invoice"),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  issueTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  seller: z.object({
    name: z.string().min(1),
    vatNumber: z.string().length(15),
    crNumber: z.string().optional(),
  }),
  buyer: z.object({
    name: z.string().min(1),
    vatNumber: z.string().length(15).optional(),
    crNumber: z.string().optional(),
  }).optional(),
  billingReferenceId: z.string().optional(),
  instructionNote: z.string().optional(),
  lines: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    vatRate: z.number().optional(),
    taxCategory: z.enum(["S", "Z", "E", "O"]).optional(),
    exemptionReason: z.string().optional(),
    exemptionReasonCode: z.string().optional(),
  })).min(1, "At least one line item is required"),
});
