import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validation/schemas";
import { registerCompany, RegisterError } from "@/lib/services/auth-service";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import { loggerFor } from "@/lib/log/logger";

export const runtime = "nodejs";

/** POST /api/auth/register — create a company + owner and open a session. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  let company, user;
  try {
    ({ company, user } = await registerCompany(parsed.data));
  } catch (err) {
    if (err instanceof RegisterError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    loggerFor(req).error("auth.register.failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Could not create your account" }, { status: 500 });
  }

  // The company, owner and trial are committed by this point. Anything that
  // throws from here on used to escape the handler entirely, so the browser
  // got a 500 with an *empty body* ("Unexpected end of JSON input") while the
  // account silently existed — and every retry then hit "a company with this
  // VAT number already exists". The user was locked out of both signing up and
  // knowing they could sign in. Session minting is the realistic failure here
  // (a missing or placeholder AUTH_SECRET), so it reports the account as
  // created and points at sign-in rather than dead-ending.
  let token: string;
  try {
    token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: company.id,
      sessionVersion: 0, // new user, version starts at 0
    });
  } catch (err) {
    loggerFor(req).error("auth.register.session_issue_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      {
        error: "Your account was created, but we could not sign you in automatically. Please sign in.",
        accountCreated: true,
      },
      { status: 201 },
    );
  }

  const res = NextResponse.json(
    {
      user: { name: user.name, email: user.email, role: user.role },
      company: { id: company.id, name: company.name, onboardingStatus: company.onboardingStatus },
    },
    { status: 201 },
  );
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
