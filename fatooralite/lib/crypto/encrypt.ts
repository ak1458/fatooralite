import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Derives a 32-byte encryption key from the AUTH_SECRET environment variable.
 */
function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is not set. Cannot perform encryption.");
  }
  return crypto.createHash("sha256").update(secret).digest();
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
