import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
// The GCM auth tag is a fixed 16 bytes; node's cipher appends it for us.

/**
 * Returns the 32-byte AES-256-GCM encryption key from the ENCRYPTION_KEY
 * environment variable.  The key is a base64-encoded 32-byte (256-bit) random
 * value — generate one with:  openssl rand -base64 32
 *
 * We intentionally do NOT fall back to AUTH_SECRET here.  The two keys serve
 * different purposes: AUTH_SECRET signs JWTs (rotatable without data loss),
 * ENCRYPTION_KEY wraps ZATCA private keys at rest (rotating it requires
 * re-encrypting every Certificate row first).  Mixing them would silently
 * corrupt stored keys whenever AUTH_SECRET is rotated.
 */
function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. " +
      "Generate one with: openssl rand -base64 32"
    );
  }
  const decoded = Buffer.from(key, "base64");
  if (decoded.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be a 32-byte (256-bit) base64-encoded key. ` +
      `Got ${decoded.length} bytes. Generate with: openssl rand -base64 32`
    );
  }
  return decoded;
}

export interface EncryptedData {
  iv: string; // Base64 encoded initialization vector
  tag: string; // Base64 encoded authentication tag
  ciphertext: string; // Base64 encoded encrypted data
}

/**
 * Encrypts a plaintext string (e.g., PEM private key) using AES-256-GCM.
 */
export function encryptString(plaintext: string): EncryptedData {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext,
  };
}

/**
 * Decrypts data previously encrypted by `encryptString`.
 */
export function decryptString(encrypted: EncryptedData): string {
  const key = getKey();
  const iv = Buffer.from(encrypted.iv, "base64");
  const tag = Buffer.from(encrypted.tag, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  decipher.setAuthTag(tag);
  
  let plaintext = decipher.update(encrypted.ciphertext, "base64", "utf8");
  plaintext += decipher.final("utf8");
  
  return plaintext;
}

/**
 * Helper to encrypt a private key and return it as a single string format:
 * `iv:tag:ciphertext`
 */
export function encryptPrivateKey(pem: string): string {
  const { iv, tag, ciphertext } = encryptString(pem);
  return `${iv}:${tag}:${ciphertext}`;
}

/**
 * Helper to decrypt a private key stored in the format:
 * `iv:tag:ciphertext`
 */
export function decryptPrivateKey(stored: string): string {
  // If it's a raw unencrypted PEM (for backwards compatibility or test environments), return it
  if (stored.includes("BEGIN PRIVATE KEY") || stored.includes("BEGIN EC PRIVATE KEY")) {
    return stored;
  }
  
  const parts = stored.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted private key format");
  }
  
  return decryptString({
    iv: parts[0],
    tag: parts[1],
    ciphertext: parts[2]
  });
}
