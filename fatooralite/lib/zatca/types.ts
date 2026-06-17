/** Inputs and outputs for the ZATCA compliance engine. */

export type InvoiceKind = "standard" | "simplified";
export type DocumentType = "invoice" | "credit" | "debit";

export interface SellerInfo {
  name: string;
  vatNumber: string; // 15-digit ZATCA VAT
  crNumber?: string;
  address?: string;
}

export interface BuyerInfo {
  name: string;
  vatNumber?: string;
}

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number; // SAR, exclusive of VAT
  vatRate?: number; // defaults to 0.15
}

export interface InvoiceInput {
  invoiceNumber: string;
  kind: InvoiceKind;
  documentType?: DocumentType; // defaults to "invoice"
  issueDate: string; // ISO date, e.g. 2026-06-17
  issueTime?: string; // HH:MM:SS, defaults to 00:00:00
  seller: SellerInfo;
  buyer?: BuyerInfo;
  lines: InvoiceLine[];
  /** Previous invoice hash (PIH) for the clearance chain; genesis = base64 of "0". */
  previousHash?: string;
}

export interface InvoiceTotals {
  taxableAmount: number; // sum of line nets
  vatAmount: number;
  grandTotal: number; // taxable + vat
}

export interface KeyPairPem {
  privateKeyPem: string;
  publicKeyPem: string;
}

export interface SignedInvoice {
  uuid: string;
  invoiceNumber: string;
  xml: string;
  hash: string; // base64 SHA-256 of xml
  signature: string; // base64 ECDSA signature of hash
  publicKeyPem: string;
  qr: string; // base64 TLV
  totals: InvoiceTotals;
}
