/**
 * WhatsApp Business Cloud API (Meta) — the intended production/compliance-
 * grade transport (D8, docs/audit/decision-register.md). Extracted
 * unchanged from lib/whatsapp/send.ts (2026-08-19) when a second provider
 * (OpenWA) was added behind the same interface — see lib/whatsapp/send.ts
 * for the dispatch logic and provider-selection rules.
 *
 * Two real steps against Meta's Graph API — a document must be uploaded to
 * get a media id before a template message can reference it, and outbound
 * business-initiated messages to a customer who hasn't messaged first MUST
 * use a pre-approved template (Meta rejects a free-form message outside the
 * 24h customer-service window) — so WHATSAPP_INVOICE_TEMPLATE_NAME must
 * name a template already approved in the Meta Business Manager for this
 * WABA. Building the template itself, getting it approved, and completing
 * Meta Business verification are all owner-only actions — nothing here can
 * substitute for that.
 */

import { log } from "@/lib/log/logger";
import type { SendWhatsAppInvoiceInput, SendWhatsAppResult } from "../types";

const GRAPH_API_VERSION = "v21.0";

export function isMetaConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_INVOICE_TEMPLATE_NAME,
  );
}

export async function sendViaMeta(
  input: SendWhatsAppInvoiceInput,
  fetchImpl: typeof fetch,
): Promise<SendWhatsAppResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const templateName = process.env.WHATSAPP_INVOICE_TEMPLATE_NAME!;
  const base = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}`;

  const mediaId = await uploadMedia(base, accessToken, input.pdfBytes, input.filename, fetchImpl);
  if (!mediaId) return { sent: false };

  const messageId = await sendTemplateMessage(base, accessToken, templateName, mediaId, input, fetchImpl);
  if (!messageId) return { sent: false };

  return { sent: true, messageId, provider: "meta" };
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
  // Buffer.from copies into a plain ArrayBuffer-backed view — Uint8Array's
  // own .buffer is typed ArrayBufferLike (which a Blob part rejects) since
  // it could be a SharedArrayBuffer.
  form.append("file", new Blob([Buffer.from(bytes)], { type: "application/pdf" }), filename);

  const res = await fetchImpl(`${base}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable body>");
    log.error("whatsapp.meta.media_upload.failed", { status: res.status, body: body.slice(0, 300) });
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
    log.error("whatsapp.meta.message_send.failed", { status: res.status, body: body.slice(0, 300) });
    return null;
  }
  const data = (await res.json()) as { messages?: { id?: string }[] };
  return data.messages?.[0]?.id ?? null;
}
