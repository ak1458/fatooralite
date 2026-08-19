/**
 * OpenWA (https://github.com/rmyndharis/OpenWA) — a self-hosted WhatsApp
 * gateway, used as a TEMPORARY interim transport while Meta Business
 * verification and template approval (D8) stay deferred.
 *
 * ============================================================================
 * NOT the production/compliance-grade path. OpenWA connects to WhatsApp
 * through reverse-engineered clients, not Meta's official Cloud API — its
 * own documentation states a non-zero risk of account/number restriction
 * and explicitly says to "treat OpenWA as not approved" for regulated
 * sectors, recommending Meta's official API instead. This integration
 * exists to keep WhatsApp delivery low-cost and available NOW, not as a
 * permanent choice. When a real customer requires WhatsApp as a production
 * commitment, migrate to lib/whatsapp/providers/meta.ts (already built —
 * see lib/whatsapp/send.ts's provider-selection order, which already
 * prefers Meta over OpenWA the moment Meta's three env vars are set).
 * Do not present this file, or OpenWA generally, as final/compliance-grade
 * anywhere in documentation — docs/audit/decision-register.md D8 records
 * this explicitly; keep that framing consistent everywhere else.
 * ============================================================================
 *
 * API contract below is taken verbatim from OpenWA's own
 * docs/06-api-specification.md (fetched 2026-08-19), not guessed:
 *
 *   POST /api/sessions/:sessionId/messages/send-document
 *     body: { chatId, base64 | url, mimetype (required with base64),
 *              filename?, caption?, quotedMessageId? }
 *     201 -> { messageId, timestamp }
 *
 *   GET /api/sessions/:sessionId
 *     200 -> { id, status, engineLoaded, phone, connectedAt, lastActive }
 *     status one of: created|initializing|qr_ready|authenticating|ready|
 *                    disconnected|action_required|failed
 *
 * Auth: `X-API-Key: <OPENWA_API_KEY>` header on every request.
 *
 * Session creation and QR pairing are deliberately NOT built into
 * FatooraLite — OpenWA already ships its own dashboard (same port as its
 * API, default 2785) for exactly that one-time, interactive, human task.
 * Building a QR-pairing UI here would be the "elaborate WhatsApp management
 * dashboard" this integration was explicitly told not to build. Pair the
 * session once, directly against OpenWA's own dashboard or its
 * `POST /sessions` -> `POST /sessions/:id/start` -> `GET /sessions/:id/qr`
 * sequence; FatooraLite only ever reads that session's status afterward.
 */

import { log } from "@/lib/log/logger";
import type { SendWhatsAppInvoiceInput, SendWhatsAppResult } from "../types";

export function isOpenWaConfigured(): boolean {
  return Boolean(process.env.OPENWA_API_URL && process.env.OPENWA_API_KEY && process.env.OPENWA_SESSION_ID);
}

function baseUrl(): string {
  return (process.env.OPENWA_API_URL ?? "").replace(/\/+$/, "");
}

function authHeaders(): Record<string, string> {
  return { "X-API-Key": process.env.OPENWA_API_KEY ?? "", "Content-Type": "application/json" };
}

/** OpenWA's chatId shape is "<digits>@c.us" — no leading "+", no other punctuation. */
function toChatId(phone: string): string {
  return `${phone.replace(/\D/g, "")}@c.us`;
}

/**
 * Sends the PDF as base64, not `url` — the invoice PDF is generated
 * per-request and never persisted at a publicly fetchable address, and
 * exposing one just so OpenWA could fetch it would be a new, unnecessary
 * attack surface. Caller (lib/whatsapp/send.ts) supplies fetchImpl for
 * deterministic tests, same convention as the Meta provider.
 */
export async function sendViaOpenWa(
  input: SendWhatsAppInvoiceInput,
  fetchImpl: typeof fetch,
): Promise<SendWhatsAppResult> {
  const sessionId = process.env.OPENWA_SESSION_ID!;
  const url = `${baseUrl()}/sessions/${encodeURIComponent(sessionId)}/messages/send-document`;
  const caption = `Invoice ${input.invoiceNumber} from ${input.sellerName} — Total: ${input.grandTotal}`;

  const res = await fetchImpl(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      chatId: toChatId(input.to),
      base64: Buffer.from(input.pdfBytes).toString("base64"),
      mimetype: "application/pdf",
      filename: input.filename,
      caption,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable body>");
    // Truncated and never includes the request we sent (which carries the
    // API key in a header, not the body) — this can only ever log OpenWA's
    // own response text.
    log.error("whatsapp.openwa.send_document.failed", { status: res.status, body: body.slice(0, 300) });
    return { sent: false };
  }

  const data = (await res.json().catch(() => ({}))) as { messageId?: string };
  if (!data.messageId) return { sent: false };
  return { sent: true, messageId: data.messageId, provider: "openwa" };
}

export interface OpenWaSessionStatus {
  configured: boolean;
  available: boolean;
  status?: string;
  error?: string;
}

/**
 * Read-only health check — "is the configured session ready to send",
 * nothing more. Never returns the API key, the session's phone number
 * verbatim, or anything QR/credential-shaped; see
 * app/api/operator/whatsapp-session/route.ts, the only caller.
 */
export async function getOpenWaSessionStatus(fetchImpl: typeof fetch = fetch): Promise<OpenWaSessionStatus> {
  if (!isOpenWaConfigured()) return { configured: false, available: false };
  const sessionId = process.env.OPENWA_SESSION_ID!;
  const url = `${baseUrl()}/sessions/${encodeURIComponent(sessionId)}`;

  try {
    const res = await fetchImpl(url, { headers: authHeaders() });
    if (!res.ok) return { configured: true, available: false, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { status?: string };
    return { configured: true, available: data.status === "ready", status: data.status };
  } catch (err) {
    return { configured: true, available: false, error: err instanceof Error ? err.message : String(err) };
  }
}
