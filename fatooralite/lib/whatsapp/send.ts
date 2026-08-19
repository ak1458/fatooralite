/**
 * WhatsApp Business Cloud API (Meta) sender — D8/N3
 * (docs/audit/decision-register.md D8, owner decision: WhatsApp IS required
 * for launch).
 *
 * Same "mock-safe degradation" convention as lib/email/send.ts: missing
 * credentials never crash the app, they fall back to logging instead of
 * sending. Two real steps against Meta's Graph API, unlike email's one —
 * a document must be uploaded to get a media id before a template message
 * can reference it, and outbound business-initiated messages to a customer
 * who hasn't messaged first MUST use a pre-approved template (Meta rejects
 * a free-form message outside the 24h customer-service window) — so
 * WHATSAPP_INVOICE_TEMPLATE_NAME must name a template already approved in
 * the Meta Business Manager for this WABA. Building the template itself,
 * getting it approved, and completing Meta Business verification are all
 * owner-only actions (docs/audit/decision-register.md D8) — nothing here
 * can substitute for that. `fetchImpl` is injectable so this is unit-
 * testable without ever calling the real Graph API.
 */

import { log } from "@/lib/log/logger";

const GRAPH_API_VERSION = "v21.0";

export interface SendWhatsAppInvoiceInput {
  /** E.164 phone number, e.g. "+9665XXXXXXXX". */
  to: string;
  invoiceNumber: string;
  sellerName: string;
  grandTotal: string;
  pdfBytes: Uint8Array;
  filename: string;
}

export interface SendWhatsAppResult {
  sent: boolean;
  /** Meta's message id, only present on a real successful send. */
  messageId?: string;
}

export async function sendWhatsAppInvoice(
  input: SendWhatsAppInvoiceInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SendWhatsAppResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_INVOICE_TEMPLATE_NAME;

  if (!accessToken || !phoneNumberId || !templateName) {
    console.log(
      `\n💬 [mock whatsapp] to=${input.to} invoice=${input.invoiceNumber} ` +
        `total=${input.grandTotal} attachment=${input.filename} (${input.pdfBytes.byteLength}b)\n`,
    );
    return { sent: false };
  }

  const base = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}`;

  try {
    const mediaId = await uploadMedia(base, accessToken, input.pdfBytes, input.filename, fetchImpl);
    if (!mediaId) return { sent: false };

    const messageId = await sendTemplateMessage(base, accessToken, templateName, mediaId, input, fetchImpl);
    if (!messageId) return { sent: false };

    return { sent: true, messageId };
  } catch (err) {
    log.error("whatsapp.delivery.error", { error: err instanceof Error ? err.message : String(err) });
    return { sent: false };
  }
}

async function uploadMedia(
  base: string,
  accessToken: string,
  bytes: Uint8Array,
  filename: string,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "application/pdf");
  form.append("file", new Blob([bytes], { type: "application/pdf" }), filename);

  const res = await fetchImpl(`${base}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable body>");
    log.error("whatsapp.media_upload.failed", { status: res.status, body: body.slice(0, 300) });
    return null;
  }
  const data = (await res.json()) as { id?: string };
  return data.id ?? null;
}

async function sendTemplateMessage(
  base: string,
  accessToken: string,
  templateName: string,
  mediaId: string,
  input: SendWhatsAppInvoiceInput,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const res = await fetchImpl(`${base}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en" },
        components: [
          { type: "header", parameters: [{ type: "document", document: { id: mediaId, filename: input.filename } }] },
          {
            type: "body",
            parameters: [
              { type: "text", text: input.sellerName },
              { type: "text", text: input.invoiceNumber },
              { type: "text", text: input.grandTotal },
            ],
          },
        ],
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable body>");
    log.error("whatsapp.message_send.failed", { status: res.status, body: body.slice(0, 300) });
    return null;
  }
  const data = (await res.json()) as { messages?: { id?: string }[] };
  return data.messages?.[0]?.id ?? null;
}
