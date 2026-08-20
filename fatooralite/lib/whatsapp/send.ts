/**
 * WhatsApp invoice delivery — provider dispatcher (D8/N3,
 * docs/audit/decision-register.md).
 *
 * Two providers exist behind this one interface:
 *   - lib/whatsapp/providers/meta.ts   — Meta WhatsApp Business Cloud API,
 *     the intended production/compliance-grade path. Deferred: needs Meta
 *     Business verification + an approved message template, both owner-only.
 *   - lib/whatsapp/providers/openwa.ts — a self-hosted gateway used as a
 *     TEMPORARY interim transport while Meta stays deferred. NOT
 *     production/compliance-grade — see that file's header.
 *
 * Selection order (checked in this order, first configured wins):
 *   1. `WHATSAPP_PROVIDER` env var, if set, forces "meta" or "openwa".
 *   2. Meta, if all three of its env vars are set — the compliance-grade
 *      path always wins automatically once it's actually configured, with
 *      no other change needed anywhere in this app.
 *   3. OpenWA, if all three of its env vars are set.
 *   4. Neither configured -> mock (log, `{sent:false}`), same "never crash"
 *      posture as lib/email/send.ts's missing-RESEND_API_KEY path.
 *
 * app/api/invoices/:id/whatsapp/route.ts — the only caller — is completely
 * unaware of which provider ran; it only ever sees `SendWhatsAppResult`.
 * Recipient resolution, tenant scoping, authorization, the feature flag,
 * rate limiting, and audit logging all live in that route, unchanged and
 * un-duplicated by this file.
 */

import { log } from "@/lib/log/logger";
import { isMetaConfigured, sendViaMeta } from "./providers/meta";
import { isOpenWaConfigured, sendViaOpenWa } from "./providers/openwa";
import type { SendWhatsAppInvoiceInput, SendWhatsAppResult, WhatsAppProviderName } from "./types";

export type { SendWhatsAppInvoiceInput, SendWhatsAppResult } from "./types";

/** Which provider `sendWhatsAppInvoice` would actually use right now, if any. */
export function activeWhatsAppProvider(): WhatsAppProviderName | null {
  const forced = process.env.WHATSAPP_PROVIDER;
  if (forced === "meta" || forced === "openwa") return forced;
  if (isMetaConfigured()) return "meta";
  if (isOpenWaConfigured()) return "openwa";
  return null;
}

/** Used by the route to decide whether an unsent result means "not configured" (mock, fine) vs "really failed" (502). */
export function isWhatsAppProviderConfigured(): boolean {
  return activeWhatsAppProvider() !== null;
}

export async function sendWhatsAppInvoice(
  input: SendWhatsAppInvoiceInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SendWhatsAppResult> {
  const provider = activeWhatsAppProvider();

  if (!provider) {
    console.log(
      `\n💬 [mock whatsapp] to=${input.to} invoice=${input.invoiceNumber} ` +
        `total=${input.grandTotal} attachment=${input.filename} (${input.pdfBytes.byteLength}b)\n`,
    );
    return { sent: false };
  }

  try {
    if (provider === "meta") return await sendViaMeta(input, fetchImpl);
    return await sendViaOpenWa(input, fetchImpl);
  } catch (err) {
    log.error("whatsapp.delivery.error", {
      provider,
      error: err instanceof Error ? err.message : String(err),
    });
    return { sent: false };
  }
}
