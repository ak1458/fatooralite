import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { authSecretKey } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * POST /api/auth/reset
 * Verifies the reset token, checks the nonce (single-use), and sets the new password.
 */
export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Invalid request. Password must be at least 8 characters." }, { status: 400 });
    }

    // Verify the JWT
    let payload;
    try {
      const result = await jwtVerify(token, authSecretKey());
      payload = result.payload;
    } catch {
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    }

    if (payload.purpose !== "reset" || !payload.userId || !payload.nonce) {
      return NextResponse.json({ error: "Invalid reset token." }, { status: 400 });
    }

    // Find user and verify nonce (single-use check)
    const user = await prisma.user.findUnique({
      where: { id: String(payload.userId) },
      select: { id: true, passwordResetNonce: true },
    });

    if (!user || user.passwordResetNonce !== String(payload.nonce)) {
      return NextResponse.json({ error: "This reset link has already been used or is invalid." }, { status: 400 });
    }

    // Hash and update password, clear the nonce, and bump sessionVersion to
    // invalidate all outstanding session cookies (prevents session fixation
    // after a password reset — old JWTs carry the old version and get
    // rejected by requirePermission's DB-version check in lib/auth/server.ts).
    const passwordHash = hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetNonce: null,
        sessionVersion: { increment: 1 },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
