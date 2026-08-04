import { SignJWT, jwtVerify } from "jose";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  companyId?: string;
  /**
   * Mirrors User.sessionVersion from the DB.  Incremented on every password
   * reset so that old tokens issued before the reset are silently rejected.
   * The guard in lib/auth/server.ts verifies this matches the DB value.
   */
  sessionVersion: number;
}

export const SESSION_COOKIE = "fl_session";

const DEV_SECRET = "dev-insecure-secret-change-me-1234567890";

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? DEV_SECRET;
  if (process.env.NODE_ENV === "production" && secret === DEV_SECRET) {
    throw new Error("AUTH_SECRET must be set to a strong value in production");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Shared signing key for all auth-related JWTs (sessions, password-reset
 * tokens, etc). Single source of truth so a secret rotation only ever
 * touches one place.
 */
export function authSecretKey(): Uint8Array {
  return secretKey();
}

/** Sign a 7-day session token. */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

/** Verify a token; returns the payload or null if invalid/expired/tampered. */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      name: String(payload.name),
      role: String(payload.role),
      companyId: payload.companyId ? String(payload.companyId) : undefined,
      sessionVersion: typeof payload.sessionVersion === "number" ? payload.sessionVersion : 0,
    };
  } catch {
    return null;
  }
}
