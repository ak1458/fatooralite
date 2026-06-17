import type { InvoiceInput, KeyPairPem, SignedInvoice } from "./types";
import { newUuid } from "./uuid";
import { buildInvoiceXml } from "./xml";
import { invoiceHash } from "./hash";
import { invoiceTotals } from "./money";
import { signHash, publicKeyDerBase64 } from "./keys";
import { buildQrBase64 } from "./qr";

export * from "./types";
export { newUuid } from "./uuid";
export { invoiceHash, genesisHash } from "./hash";
export { invoiceTotals, lineNet, lineVat, round2, STANDARD_VAT_RATE } from "./money";
export { tlv, buildQrBase64 } from "./qr";
export { generateKeyPair, signHash, verifyHash, publicKeyDerBase64 } from "./keys";
export { generateCsr } from "./csr";
export { buildInvoiceXml } from "./xml";

/**
 * Full Phase-2 pipeline for one invoice:
 * uuid → UBL XML → SHA-256 hash → ECDSA signature → TLV QR.
 */
export function generateSignedInvoice(
  input: InvoiceInput,
  keyPair: KeyPairPem,
): SignedInvoice {
  const uuid = newUuid();
  const xml = buildInvoiceXml(input, uuid);
  const hash = invoiceHash(xml);
  const signature = signHash(hash, keyPair.privateKeyPem);
  const totals = invoiceTotals(input.lines);
  const timestamp = `${input.issueDate}T${input.issueTime ?? "00:00:00"}`;

  const qr = buildQrBase64({
    sellerName: input.seller.name,
    vatNumber: input.seller.vatNumber,
    timestamp,
    invoiceTotal: totals.grandTotal.toFixed(2),
    vatTotal: totals.vatAmount.toFixed(2),
    hash,
    signature,
    publicKey: publicKeyDerBase64(keyPair.publicKeyPem),
  });

  return {
    uuid,
    invoiceNumber: input.invoiceNumber,
    xml,
    hash,
    signature,
    publicKeyPem: keyPair.publicKeyPem,
    qr,
    totals,
  };
}
