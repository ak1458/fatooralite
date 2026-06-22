/** Inputs and outputs for the ZATCA compliance engine. */

export type InvoiceKind = "standard" | "simplified";
export type DocumentType = "invoice" | "credit" | "debit";

/**
 * ZATCA tax category codes (UNCL5305 subset used in KSA).
 * S = Standard rated (15%), Z = Zero rated, E = Exempt, O = Out of scope.
 */
export type TaxCategoryCode = "S" | "Z" | "E" | "O";

/** Full postal address per ZATCA BT-35..BT-40 requirements. */
export interface PostalAddress {
  streetName?: string;        // BT-35
  buildingNumber?: string;    // KSA-17
  plotIdentification?: string; // KSA-23 (additional street name)
  citySubdivision?: string;   // KSA-18 (district / neighborhood)
  cityName?: string;          // BT-37
  postalZone?: string;        // BT-38
  countrySubentity?: string;  // BT-39 (province/region)
  countryCode?: string;       // BT-40, defaults to "SA"
}

export interface SellerInfo {
  name: string;
  vatNumber: string;          // 15-digit ZATCA VAT (3XXXXXXXXXXXXX3)
  crNumber?: string;          // Commercial Registration number
  address?: PostalAddress;
}

export interface BuyerInfo {
  name: string;
  vatNumber?: string;
  crNumber?: string;
  address?: PostalAddress;
}

/** Line-level or document-level allowance/charge. */
export interface AllowanceCharge {
  isCharge: boolean;          // false = allowance (discount), true = charge
  amount: number;             // SAR
  reason?: string;
  reasonCode?: string;        // UNCL5189
}

/** Payment means per ZATCA BT-81..BT-83. */
export interface PaymentMeans {
  code: string;               // UNCL4461: "10" = cash, "30" = credit, "42" = bank transfer, "48" = card
  instructionNote?: string;
}

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;          // SAR, exclusive of VAT
  unitCode?: string;          // UN/ECE Rec. 20 unit code, defaults to "PCE"
  vatRate?: number;           // defaults to 0.15
  taxCategory?: TaxCategoryCode; // defaults to "S"
  exemptionReason?: string;  // required when taxCategory is E or Z
  exemptionReasonCode?: string;
  allowances?: AllowanceCharge[];
}

export interface InvoiceInput {
  invoiceNumber: string;
  kind: InvoiceKind;
  documentType?: DocumentType; // defaults to "invoice"
  issueDate: string;          // ISO date, e.g. 2026-06-17
  issueTime?: string;         // HH:MM:SS, defaults to 00:00:00
  seller: SellerInfo;
  buyer?: BuyerInfo;
  lines: InvoiceLine[];

  /** Previous invoice hash (PIH) for the clearance chain; genesis = base64 SHA-256 of "0". */
  previousHash?: string;
  /** Invoice counter value (ICV) — auto-incremented sequential number. */
  icv?: number;

  /** Payment means (defaults to cash "10"). */
  paymentMeans?: PaymentMeans;
  /** Document-level allowances/charges. */
  allowances?: AllowanceCharge[];

  // Credit/debit note fields
  /** Original invoice number being referenced (required for credit/debit notes). */
  billingReferenceId?: string;
  /** Reason for the credit/debit note (cbc:InstructionNote). */
  instructionNote?: string;
}

/** Per-tax-category subtotal (for cac:TaxTotal/cac:TaxSubtotal). */
export interface TaxSubtotal {
  taxCategory: TaxCategoryCode;
  taxableAmount: number;
  taxAmount: number;
  percent: number;            // e.g. 15 for standard, 0 for zero-rated
  exemptionReason?: string;
  exemptionReasonCode?: string;
}

export interface InvoiceTotals {
  taxableAmount: number;      // sum of line nets
  vatAmount: number;
  grandTotal: number;         // taxable + vat
  allowanceTotalAmount: number;
  chargeTotalAmount: number;
  taxSubtotals: TaxSubtotal[];
}

export interface KeyPairPem {
  privateKeyPem: string;
  publicKeyPem: string;
}

export interface SignedInvoice {
  uuid: string;
  invoiceNumber: string;
  xml: string;                // the final signed XML with XAdES + QR
  hash: string;               // base64 SHA-256 of the canonical invoice body
  signature: string;           // base64 ECDSA signature of hash
  publicKeyPem: string;
  qr: string;                 // base64 TLV
  totals: InvoiceTotals;
}
