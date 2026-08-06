import forge from "node-forge";

/**
 * ZATCA QR Tag 9 = the ECDSA signature ZATCA's CA applied over your EGS
 * cryptographic-stamp public key when it issued the Production CSID. It is the
 * `signatureValue` field of the X.509 CSID certificate. Mandatory on simplified
 * (B2C) invoice QR codes.
 *
 * Accepts the certificate either as PEM (with BEGIN/END lines) or as the raw
 * base64 DER form ZATCA returns in `binarySecurityToken`.
 */
export function extractCaSignature(cert: string): Buffer {
  const parsed = cert.includes("BEGIN CERTIFICATE")
    ? forge.pki.certificateFromPem(cert)
    : forge.pki.certificateFromAsn1(
        forge.asn1.fromDer(forge.util.decode64(cert.replace(/\s+/g, ""))),
      );
  // cert.signature is the raw CA signatureValue as a binary string.
  return Buffer.from(parsed.signature, "binary");
}

/** Tag 9 value as base64, matching how tags 6–8 are passed to the TLV builder. */
export function tag9Base64(cert: string): string {
  return extractCaSignature(cert).toString("base64");
}

/** True when the certificate looks like a real issued CSID (parseable X.509),
 *  not the local-dev public-key placeholder. */
export function isRealCsid(cert: string | null | undefined): boolean {
  if (!cert) return false;
  try {
    extractCaSignature(cert);
    return true;
  } catch {
    return false;
  }
}
