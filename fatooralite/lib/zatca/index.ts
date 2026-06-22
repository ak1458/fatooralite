import type { InvoiceInput, KeyPairPem, SignedInvoice } from "./types";
import { newUuid } from "./uuid";
import { buildInvoiceXml } from "./xml";
import { invoiceHash } from "./hash";
import { invoiceTotals } from "./money";
import { signHash, publicKeyDerBase64 } from "./keys";
import { buildQrBase64 } from "./qr";
import { buildXadesSignature, injectSignature, injectQrCode } from "./xades";

export * from "./types";
export { newUuid } from "./uuid";
export { invoiceHash, genesisHash, rawHash, rawHashBytes } from "./hash";
export { invoiceTotals, lineNet, lineVat, round2, STANDARD_VAT_RATE, effectiveRate, taxSubtotals } from "./money";
export { tlv, buildQrBase64 } from "./qr";
export { generateKeyPair, signHash, verifyHash, publicKeyDerBase64 } from "./keys";
export { generateCsr } from "./csr";
export { buildInvoiceXml } from "./xml";
export { canonicalizeInvoice, getInvoiceBodyForHashing } from "./canonicalize";
export { buildXadesSignature, injectSignature, injectQrCode } from "./xades";

/**
 * Full Phase-2 pipeline for one invoice:
 *
 * 1. Generate UUID
 * 2. Build UBL XML (with UBLExtensions placeholder)
 * 3. Build XAdES signature and inject into XML
 * 4. Compute canonical hash (excluding UBLExtensions)
 * 5. Build QR with binary tags 6–9
 * 6. Inject QR into the XML
 * 7. Return the complete signed invoice
 */
export function generateSignedInvoice(
  input: InvoiceInput,
  keyPair: KeyPairPem,
  options?: {
    certificateBase64?: string;
    certificateSerialNumber?: string;
    certificateIssuer?: string;
  },
): SignedInvoice {
  const uuid = newUuid();
  const totals = invoiceTotals(input.lines, input.allowances);
  const timestamp = `${input.issueDate}T${input.issueTime ?? "00:00:00"}`;

  // Step 1: Build the base UBL XML
  let xml = buildInvoiceXml(input, uuid);

  // Step 2: Build and inject the XAdES signature
  const signatureXml = buildXadesSignature({
    invoiceXml: xml,
    privateKeyPem: keyPair.privateKeyPem,
    certificateBase64: options?.certificateBase64,
    certificateSerialNumber: options?.certificateSerialNumber,
    certificateIssuer: options?.certificateIssuer,
    signingTime: timestamp,
  });
  xml = injectSignature(xml, signatureXml);

  // Step 3: Compute the canonical hash (excluding UBLExtensions)
  const hash = invoiceHash(xml);

  // Step 4: ECDSA sign the hash
  const signature = signHash(hash, keyPair.privateKeyPem);

  // Step 5: Build QR with binary phase-2 tags
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

  // Step 6: Inject QR into the XML
  xml = injectQrCode(xml, qr);

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
