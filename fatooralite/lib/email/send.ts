/**
 * Transactional email sender. Uses Resend's HTTP API directly (no SDK — see
 * lib/ai/provider.ts / lib/env.ts for the same "mock-safe degradation"
 * convention this follows): a missing RESEND_API_KEY never crashes the app,
 * it just falls back to logging the email instead of sending it.
 */

import { log } from "@/lib/log/logger";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  sent: boolean;
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    const preview = html.replace(/\s+/g, " ").trim().slice(0, 200);
    console.log(`\n📧 [mock email] to=${to} subject="${subject}"\n   ${preview}${preview.length === 200 ? "..." : ""}\n`);
    return { sent: false };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Fatoora Lite Pro <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "<unreadable body>");
      log.error("email.delivery.failed", { status: res.status, body: body.slice(0, 300) });
      return { sent: false };
    }

    return { sent: true };
  } catch (err) {
    log.error("email.delivery.error", { error: err instanceof Error ? err.message : String(err) });
    return { sent: false };
  }
}
