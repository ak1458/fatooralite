/**
 * ZATCA QR code: a TLV (Tag-Length-Value) byte string, base64-encoded.
 * Phase 1 = tags 1–5; Phase 2 adds tags 6–9 (hash, signature, public key,
 * stamp signature).
 *
 * Tags 6–9 use RAW BINARY data, not base64-encoded strings.
 */

/**
 * Encode one TLV entry: [tag][length][value bytes].
 * Supports length > 127 using multi-byte length encoding.
 */
export function tlv(tag: number, value: string | Buffer): Buffer {
  const valueBuf = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  const len = valueBuf.length;

  let header: Buffer;
  if (len <= 127) {
    header = Buffer.from([tag, len]);
  } else if (len <= 255) {
    header = Buffer.from([tag, 0x81, len]);
  } else {
    header = Buffer.from([tag, 0x82, (len >> 8) & 0xff, len & 0xff]);
  }
  return Buffer.concat([header, valueBuf]);
}

export interface QrFields {
  sellerName: string;       // tag 1 (UTF-8 string)
  vatNumber: string;        // tag 2 (UTF-8 string)
  timestamp: string;        // tag 3 (ISO 8601 string)
  invoiceTotal: string;     // tag 4 (grand total, incl. VAT, UTF-8 string)
  vatTotal: string;         // tag 5 (UTF-8 string)
  // Phase-2 tags: these should be raw binary data (bytes), not base64 strings
  hash?: string;            // tag 6 (base64 → decoded to raw bytes)
  signature?: string;       // tag 7 (base64 → decoded to raw bytes)
  publicKey?: string;       // tag 8 (base64 DER → decoded to raw bytes)
  stampSignature?: string;  // tag 9 (base64 → decoded to raw bytes)
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

  // Tags 6–9 use raw binary bytes (decode from base64 input)
  if (f.hash) parts.push(tlv(6, Buffer.from(f.hash, "base64")));
  if (f.signature) parts.push(tlv(7, Buffer.from(f.signature, "base64")));
  if (f.publicKey) parts.push(tlv(8, Buffer.from(f.publicKey, "base64")));
  if (f.stampSignature) parts.push(tlv(9, Buffer.from(f.stampSignature, "base64")));

  return Buffer.concat(parts).toString("base64");
}
