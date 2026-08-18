import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/db/repo";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/schemas";

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

  const res = NextResponse.json({
    user: { name: user.name, email: user.email, role: user.role },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
