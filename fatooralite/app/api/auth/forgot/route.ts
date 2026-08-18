import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/db/client";
import { authSecretKey } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { recordSecurityEvent, SECURITY_EVENTS } from "@/lib/audit/events";
import { appUrl } from "@/lib/appUrl";
import { loggerFor } from "@/lib/log/logger";

export const runtime = "nodejs";

function resetEmailHtml(resetUrl: string): string {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
  <h1 style="font-size: 20px; margin: 0 0 16px;">Reset your password</h1>
  <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px; color: #333;">
    We received a request to reset the password for your Fatoora Lite Pro account.
    Click the button below to choose a new password.
  </p>
  <p style="margin: 0 0 24px;">
    <a href="${resetUrl}"
       style="display: inline-block; background-color: #0f766e; color: #ffffff; text-decoration: none;
              padding: 12px 24px; border-radius: 6px; font-size: 15px; font-weight: 600;">
      Reset password
    </a>
  </p>
  <p style="font-size: 13px; line-height: 1.6; color: #666; margin: 0 0 8px;">
    This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
  </p>
  <p style="font-size: 13px; line-height: 1.6; color: #666; margin: 0;">
    If the button doesn't work, copy and paste this link into your browser:<br />
    <a href="${resetUrl}" style="color: #0f766e; word-break: break-all;">${resetUrl}</a>
  </p>
</div>`.trim();
}

/**
 * POST /api/auth/forgot
 * Generates a password-reset JWT (1-hour expiry) and emails it to the user
 * (falls back to console-logging the link if email delivery isn't
 * configured — see lib/email/send.ts). Always returns 200 to prevent email
 * enumeration, regardless of whether the account exists or delivery succeeded.
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
        .sign(authSecretKey());

      // Canonical deployed URL, not the caller's Origin header — a caller
      // that sends no Origin (or a forged one, though the proxy's CSRF check
      // already blocks that — verified 403) must not steer where the reset
      // link points.
      const resetUrl = `${appUrl()}/reset?token=${token}`;
      // Recorded whether or not delivery is configured: a reset request is a
      // security-relevant act, and its absence from the log would hide an
      // account-takeover attempt that never produced an email.
      await recordSecurityEvent({
        action: SECURITY_EVENTS.passwordResetRequested,
        outcome: "success",
        companyId: user.companyId,
        actorId: user.id,
        actorEmail: user.email,
        request: req,
      });

      await sendEmail({
        to: email,
        subject: "Reset your Fatoora Lite Pro password",
        html: resetEmailHtml(resetUrl),
      });
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({ ok: true });
  } catch (err) {
    loggerFor(req).error("auth.forgot.failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: true });
  }
}
