/** Shared between lib/whatsapp/send.ts (the dispatcher) and every provider under lib/whatsapp/providers/. */

export interface SendWhatsAppInvoiceInput {
  /** E.164-ish phone number, e.g. "+9665XXXXXXXX" (route validates the format before this is called). */
  to: string;
  invoiceNumber: string;
  sellerName: string;
  grandTotal: string;
  pdfBytes: Uint8Array;
  filename: string;
}

export type WhatsAppProviderName = "meta" | "openwa";

export interface SendWhatsAppResult {
  sent: boolean;
  /** The provider's own message id, only present on a real successful send. */
  messageId?: string;
  /** Which provider actually attempted the send — absent when nothing was configured (mock). */
  provider?: WhatsAppProviderName;
}
