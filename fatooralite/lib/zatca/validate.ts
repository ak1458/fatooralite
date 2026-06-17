import type { InvoiceInput } from "./types";

export interface ValidationIssue {
  code: string; // ZATCA-style business rule code
  message: string;
}

/**
 * Pre-submission business-rule checks (a pragmatic subset of ZATCA BR-KSA
 * rules). Returns the first blocking issue, or null when the invoice is valid.
 */
export function validateInvoice(input: InvoiceInput): ValidationIssue | null {
  if (!input.lines || input.lines.length === 0) {
    return { code: "BR-KSA-00", message: "Invoice must have at least one line" };
  }
  if (!/^3\d{13}3$/.test(input.seller.vatNumber)) {
    return { code: "BR-KSA-39", message: "Seller VAT number must be 15 digits starting and ending with 3" };
  }
  if (input.kind === "standard" && !input.buyer?.vatNumber) {
    return { code: "BR-KSA-44", message: "Buyer VAT number is required for a standard tax invoice" };
  }
  if (input.buyer?.vatNumber && !/^\d{15}$/.test(input.buyer.vatNumber)) {
    return { code: "BR-KSA-09", message: "Buyer VAT number must be 15 digits" };
  }
  for (const line of input.lines) {
    if (line.quantity <= 0) {
      return { code: "BR-KSA-21", message: `Quantity must be positive for "${line.description}"` };
    }
    if (line.unitPrice < 0) {
      return { code: "BR-KSA-22", message: `Unit price cannot be negative for "${line.description}"` };
    }
  }
  return null;
}
