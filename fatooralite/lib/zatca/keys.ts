import {
  generateKeyPairSync,
  sign as cryptoSign,
  verify as cryptoVerify,
  createPublicKey,
} from "node:crypto";
import type { KeyPairPem } from "./types";

/**
 * Generate a secp256k1 EC key pair (the curve ZATCA requires for the
 * cryptographic stamp). Returns PEM-encoded keys.
 */
export function generateKeyPair(): KeyPairPem {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "secp256k1",
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { privateKeyPem: privateKey, publicKeyPem: publicKey };
}

/**
 * ECDSA-sign the invoice hash. Convention: signature = ECDSA(SHA-256(hashBytes)).
 * Sign and verify use the same convention so the stamp round-trips.
 */
export function signHash(hashBase64: string, privateKeyPem: string): string {
  const data = Buffer.from(hashBase64, "base64");
  return cryptoSign("sha256", data, privateKeyPem).toString("base64");
}

/** Verify a signature produced by signHash. */
export function verifyHash(
  hashBase64: string,
  signatureBase64: string,
  publicKeyPem: string,
): boolean {
  const data = Buffer.from(hashBase64, "base64");
  return cryptoVerify("sha256", data, publicKeyPem, Buffer.from(signatureBase64, "base64"));
}

/** DER-encoded public key as base64 — used for QR tag 8. */
export function publicKeyDerBase64(publicKeyPem: string): string {
  const der = createPublicKey(publicKeyPem).export({ type: "spki", format: "der" });
  return Buffer.from(der).toString("base64");
}
