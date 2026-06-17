/**
 * ZATCA QR code: a TLV (Tag-Length-Value) byte string, base64-encoded.
 * Phase 1 = tags 1–5; Phase 2 adds tags 6–9 (hash, signature, public key,
 * stamp signature).
 */

/** Encode one TLV entry: [tag][length][value bytes]. */
export function tlv(tag: number, value: string | Buffer): Buffer {
  const valueBuf = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  const header = Buffer.from([tag, valueBuf.length]);
  return Buffer.concat([header, valueBuf]);
}

export interface QrFields {
  sellerName: string; // tag 1
  vatNumber: string; // tag 2
  timestamp: string; // tag 3 (ISO 8601)
  invoiceTotal: string; // tag 4 (grand total, incl. VAT)
  vatTotal: string; // tag 5
  hash?: string; // tag 6 (base64 invoice hash)
  signature?: string; // tag 7 (base64 ECDSA signature)
  publicKey?: string; // tag 8 (base64 DER public key)
  stampSignature?: string; // tag 9
}

/** Build the base64 TLV QR payload from invoice fields. */
export function buildQrBase64(f: QrFields): string {
  const parts: Buffer[] = [
    tlv(1, f.sellerName),
    tlv(2, f.vatNumber),
    tlv(3, f.timestamp),
    tlv(4, f.invoiceTotal),
    tlv(5, f.vatTotal),
  ];
  if (f.hash) parts.push(tlv(6, f.hash));
  if (f.signature) parts.push(tlv(7, f.signature));
  if (f.publicKey) parts.push(tlv(8, f.publicKey));
  if (f.stampSignature) parts.push(tlv(9, f.stampSignature));
  return Buffer.concat(parts).toString("base64");
}
