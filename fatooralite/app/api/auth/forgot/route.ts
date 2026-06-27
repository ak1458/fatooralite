import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/db/client";

export const runtime = "nodejs";

const DEV_SECRET = "dev-insecure-secret-change-me-1234567890";
function secretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? DEV_SECRET);
}

/**
 * POST /api/auth/forgot
 * Generates a password-reset JWT (1-hour expiry) and logs it to the console.
 * Always returns 200 to prevent email enumeration.
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: true }); // generic success
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (user) {
      // Generate a nonce so the token is single-use
      const nonce = crypto.randomUUID();
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetNonce: nonce },
      });

      const token = await new SignJWT({ userId: user.id, purpose: "reset", nonce })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(secretKey());

      const resetUrl = `${req.headers.get("origin") ?? "http://localhost:3000"}/reset?token=${token}`;
      console.log(`\n🔑 Password reset link for ${email}:\n   ${resetUrl}\n`);
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ ok: true });
  }
}
