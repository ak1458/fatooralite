import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validation/schemas";
import { registerCompany, RegisterError } from "@/lib/services/auth-service";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

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
    console.error("Register error:", err);
    return NextResponse.json({ error: "Could not create your account" }, { status: 500 });
  }

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: company.id,
  });

  const res = NextResponse.json(
    {
      user: { name: user.name, email: user.email, role: user.role },
      company: { id: company.id, name: company.name, onboardingStatus: company.onboardingStatus },
    },
    { status: 201 },
  );
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
