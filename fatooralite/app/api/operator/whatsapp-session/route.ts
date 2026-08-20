import { NextResponse } from "next/server";
import { recordSecurityEvent, SECURITY_EVENTS } from "@/lib/audit/events";
import { activeWhatsAppProvider } from "@/lib/whatsapp/send";
import { getOpenWaSessionStatus } from "@/lib/whatsapp/providers/openwa";

export const runtime = "nodejs";

/**
 * GET /api/operator/whatsapp-session — read-only WhatsApp provider/session
 * health, nothing more.
 *
 * "The minimum operational surface required" for OpenWA (a temporary
 * interim transport, 2026-08-19 — see lib/whatsapp/providers/openwa.ts):
 * whether a session is configured and ready to send. Deliberately does NOT
 * expose the API key, the paired phone number, or a QR code — pairing is a
 * one-time, interactive, human task done directly against OpenWA's own
 * dashboard (see that file's header), not something this app builds UI for.
 *
 * Same OPERATOR_SECRET bearer-credential pattern as
 * GET /api/operator/companies (D7) and POST /api/ai/ingest (W6) — no
 * tenant session, however privileged, can reach this; there is deliberately
 * no platform-admin User role in this app.
 */
export async function GET(req: Request) {
  const secret = process.env.OPERATOR_SECRET;
  const provided = req.headers.get("authorization");
  if (!secret || provided !== `Bearer ${secret}`) {
    await recordSecurityEvent({
      action: SECURITY_EVENTS.operatorAccessDenied,
      outcome: "denied",
      targetType: "company",
      metadata: { route: "operator.whatsapp-session" },
      request: req,
    });
    return NextResponse.json(
      { error: "This surface requires an operator credential." },
      { status: 403 },
    );
  }

  const provider = activeWhatsAppProvider();
  const body =
    provider === "openwa"
      ? { provider, ...(await getOpenWaSessionStatus()) }
      : provider === "meta"
        ? { provider, configured: true, available: true } // Meta has no session-readiness concept — either configured or not.
        : { provider: null, configured: false, available: false };

  await recordSecurityEvent({
    action: SECURITY_EVENTS.operatorWhatsappSessionViewed,
    outcome: "success",
    metadata: { provider: provider ?? "none" },
    request: req,
  });

  return NextResponse.json(body);
}
