import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/db/repo";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/schemas";
import { recordSecurityEvent, SECURITY_EVENTS } from "@/lib/audit/events";

export const runtime = "nodejs";

/** POST /api/auth/login — verify credentials and set a session cookie. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate before touching the database. The previous hand-rolled check only
  // tested truthiness, so a JSON body whose "email" was an object — e.g.
  // {"email":{"contains":"@"}} — was handed straight to Prisma as a where
  // clause and came back as an unhandled 500 rather than a 401. Nothing was
  // bypassed (Prisma rejects the shape), but an attacker-triggerable 500 on the
  // login endpoint is both an availability problem and a probe that tells them
  // exactly which layer they reached.
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await findUserByEmail(email);
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    // Recorded so brute-force and credential-stuffing attempts are visible after
    // the fact. `companyId` is whatever the address resolves to, or null when it
    // matches no account — a null-tenant row is unreachable from any tenant's
    // event view, which is what keeps this from leaking account existence.
    await recordSecurityEvent({
      action: SECURITY_EVENTS.loginFailure,
      outcome: "failure",
      companyId: user?.companyId ?? null,
      actorId: user?.id ?? null,
      actorEmail: email,
      request: req,
      metadata: { reason: user ? "bad_password" : "unknown_account" },
    });
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId ?? undefined,
    sessionVersion: user.sessionVersion,
  });

  await recordSecurityEvent({
    action: SECURITY_EVENTS.loginSuccess,
    outcome: "success",
    companyId: user.companyId,
    actorId: user.id,
    actorEmail: user.email,
    request: req,
    metadata: { role: user.role },
  });

  const res = NextResponse.json({
    user: { name: user.name, email: user.email, role: user.role },
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
