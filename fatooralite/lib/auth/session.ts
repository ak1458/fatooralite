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
  /** Epoch seconds the token was issued (JWT `iat`). Drives W19's refresh window. */
  iat?: number;
}

export const SESSION_COOKIE = "fl_session";

/** 7-day session lifetime, shared by every place that sets the cookie or the JWT `exp`. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
/** A session older than this (but still valid) is eligible for a sliding refresh — see W19. */
export const SESSION_REFRESH_AFTER_SECONDS = 60 * 60 * 24;

/** The cookie options every route that sets `fl_session` must use — one definition, so a
 * refresh (W19) can never drift from what login/register originally set. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

import { DEV_AUTH_SECRET } from "@/lib/auth/dev-secret";

const DEV_SECRET = DEV_AUTH_SECRET;

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

/**
 * Sign a 7-day session token. `opts.issuedAt` lets a caller backdate `iat` —
 * used only by tests exercising the W19 refresh window; production callers
 * never pass it, which mints `iat` as now.
 */
export async function createSessionToken(
  payload: SessionPayload,
  opts?: { issuedAt?: Date },
): Promise<string> {
  // Destructure `iat` out rather than trust jose to override a stale claim on
  // the spread — a payload re-minted from a decoded token (W19's refresh path)
  // carries its old `iat`, and this call must always mint a fresh one.
  const { iat: _iat, ...claims } = payload;
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(opts?.issuedAt ?? undefined)
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
      iat: typeof payload.iat === "number" ? payload.iat : undefined,
    };
  } catch {
    return null;
  }
}
