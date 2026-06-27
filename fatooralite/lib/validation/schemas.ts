import { z } from "zod";

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
});
export type RegisterInput = z.infer<typeof registerSchema>;

// --- Companies ---
export const updateCompanySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  nameAr: z.string().max(100).optional().nullable(),
  vatNumber: z.string().length(15, "VAT must be exactly 15 digits").regex(/^[0-9]+$/, "VAT must contain only digits"),
  crNumber: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

// --- Customers ---
export const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  vatNumber: z.string().length(15).regex(/^[0-9]+$/).optional().nullable(),
  crNumber: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
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
  invoiceNumber: z.string().min(1),
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
