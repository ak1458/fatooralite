import { createHash } from "node:crypto";
import { getInvoiceBodyForHashing } from "./canonicalize";

/**
 * SHA-256 of the canonicalized invoice XML (excluding UBLExtensions/signature),
 * returned as base64. This is the ZATCA-compliant invoice hash.
 */
export function invoiceHash(xml: string): string {
  const canonical = getInvoiceBodyForHashing(xml);
  return createHash("sha256").update(canonical, "utf8").digest("base64");
}

/**
 * SHA-256 hash of a raw string, base64-encoded.
 * Used for signing properties digest, etc.
 */
export function rawHash(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("base64");
}

/** SHA-256 hash of raw bytes, base64-encoded. */
export function rawHashBytes(data: Buffer): string {
  return createHash("sha256").update(data).digest("base64");
}

/** Genesis previous-invoice-hash (PIH) used for the first invoice in a chain. */
export function genesisHash(): string {
  // ZATCA convention: base64 of the SHA-256 of "0".
  return createHash("sha256").update("0", "utf8").digest("base64");
}
