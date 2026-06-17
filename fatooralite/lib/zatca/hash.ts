import { createHash } from "node:crypto";

/** SHA-256 of the given string (UTF-8), returned base64 — the invoice hash. */
export function invoiceHash(xml: string): string {
  return createHash("sha256").update(xml, "utf8").digest("base64");
}

/** Genesis previous-invoice-hash (PIH) used for the first invoice in a chain. */
export function genesisHash(): string {
  // ZATCA convention: base64 of the SHA-256 of "0".
  return createHash("sha256").update("0", "utf8").digest("base64");
}
