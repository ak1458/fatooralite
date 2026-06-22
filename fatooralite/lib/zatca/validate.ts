import type { InvoiceInput } from "./types";

export interface ValidationIssue {
  code: string;   // ZATCA-style business rule code
  message: string;
}

/**
 * Pre-submission business-rule checks (ZATCA BR-KSA rules subset).
 * Returns the first blocking issue, or null when the invoice is valid.
 */
export function validateInvoice(input: InvoiceInput): ValidationIssue | null {
  // --- Basic structure ---
  if (!input.lines || input.lines.length === 0) {
    return { code: "BR-KSA-00", message: "Invoice must have at least one line" };
  }

  // --- Seller validation ---
  if (!/^3\d{13}3$/.test(input.seller.vatNumber)) {
    return { code: "BR-KSA-39", message: "Seller VAT number must be 15 digits starting and ending with 3" };
  }

  // --- Buyer validation ---
  if (input.kind === "standard" && !input.buyer?.vatNumber) {
    return { code: "BR-KSA-44", message: "Buyer VAT number is required for a standard tax invoice" };
  }
  if (input.buyer?.vatNumber && !/^\d{15}$/.test(input.buyer.vatNumber)) {
    return { code: "BR-KSA-09", message: "Buyer VAT number must be 15 digits" };
  }

  // --- Issue date validation ---
  if (!input.issueDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.issueDate)) {
    return { code: "BR-KSA-01", message: "Issue date must be in YYYY-MM-DD format" };
  }

  // --- ICV validation ---
  if (input.icv !== undefined && (input.icv <= 0 || !Number.isInteger(input.icv))) {
    return { code: "BR-KSA-33", message: "Invoice counter value (ICV) must be a positive integer" };
  }

  // --- Credit/debit note validation ---
  if (input.documentType === "credit" || input.documentType === "debit") {
    if (!input.billingReferenceId) {
      return { code: "BR-KSA-56", message: "Credit/debit notes must reference the original invoice number (BillingReference)" };
    }
    if (!input.instructionNote) {
      return { code: "BR-KSA-57", message: "Credit/debit notes must include a reason (InstructionNote)" };
    }
  }

  // --- Line-level validation ---
  for (const line of input.lines) {
    if (line.quantity <= 0) {
      return { code: "BR-KSA-21", message: `Quantity must be positive for "${line.description}"` };
    }
    if (line.unitPrice < 0) {
      return { code: "BR-KSA-22", message: `Unit price cannot be negative for "${line.description}"` };
    }
    // Zero/exempt lines must have an exemption reason
    if (line.taxCategory && (line.taxCategory === "E" || line.taxCategory === "Z")) {
      if (!line.exemptionReason) {
        return {
          code: "BR-KSA-27",
          message: `Exemption reason is required for zero-rated/exempt line "${line.description}"`,
        };
      }
    }
  }

  // --- Tax category consistency ---
  const categories = new Set(input.lines.map((l) => l.taxCategory ?? "S"));
  if (categories.has("S") && categories.has("E")) {
    // It's allowed to mix categories, but log a warning
    // ZATCA allows mixed categories as long as each line has the correct subtotal
  }

  return null;
}

/** Validate all invoice rules and return ALL issues (not just the first). */
export function validateInvoiceAll(input: InvoiceInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.lines || input.lines.length === 0) {
    issues.push({ code: "BR-KSA-00", message: "Invoice must have at least one line" });
  }
  if (!/^3\d{13}3$/.test(input.seller.vatNumber)) {
    issues.push({ code: "BR-KSA-39", message: "Seller VAT number must be 15 digits starting and ending with 3" });
  }
  if (input.kind === "standard" && !input.buyer?.vatNumber) {
    issues.push({ code: "BR-KSA-44", message: "Buyer VAT number is required for a standard tax invoice" });
  }
  if (input.buyer?.vatNumber && !/^\d{15}$/.test(input.buyer.vatNumber)) {
    issues.push({ code: "BR-KSA-09", message: "Buyer VAT number must be 15 digits" });
  }
  if (!input.issueDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.issueDate)) {
    issues.push({ code: "BR-KSA-01", message: "Issue date must be in YYYY-MM-DD format" });
  }
  if (input.icv !== undefined && (input.icv <= 0 || !Number.isInteger(input.icv))) {
    issues.push({ code: "BR-KSA-33", message: "Invoice counter value (ICV) must be a positive integer" });
  }
  if ((input.documentType === "credit" || input.documentType === "debit") && !input.billingReferenceId) {
    issues.push({ code: "BR-KSA-56", message: "Credit/debit notes must reference the original invoice number" });
  }
  if ((input.documentType === "credit" || input.documentType === "debit") && !input.instructionNote) {
    issues.push({ code: "BR-KSA-57", message: "Credit/debit notes must include a reason" });
  }

  if (input.lines) {
    for (const line of input.lines) {
      if (line.quantity <= 0) {
        issues.push({ code: "BR-KSA-21", message: `Quantity must be positive for "${line.description}"` });
      }
      if (line.unitPrice < 0) {
        issues.push({ code: "BR-KSA-22", message: `Unit price cannot be negative for "${line.description}"` });
      }
      if ((line.taxCategory === "E" || line.taxCategory === "Z") && !line.exemptionReason) {
        issues.push({ code: "BR-KSA-27", message: `Exemption reason required for "${line.description}"` });
      }
    }
  }

  return issues;
}
