import { describe, it, expect, afterEach, vi } from "vitest";
import { sendWhatsAppInvoice, activeWhatsAppProvider, isWhatsAppProviderConfigured } from "./send";

const ORIGINAL_ENV = { ...process.env };

function setCreds() {
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "1234567890";
  process.env.WHATSAPP_INVOICE_TEMPLATE_NAME = "invoice_delivery";
}

function setOpenWaCreds() {
  process.env.OPENWA_API_URL = "http://localhost:2785/api";
  process.env.OPENWA_API_KEY = "test-openwa-key";
  process.env.OPENWA_SESSION_ID = "session-abc";
}

const input = {
  to: "+966500000000",
  invoiceNumber: "INV-2026-00001",
  sellerName: "Test Co",
  grandTotal: "1150.00",
  pdfBytes: new Uint8Array([1, 2, 3]),
  filename: "invoice_INV-2026-00001.pdf",
};

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("sendWhatsAppInvoice", () => {
  it("falls back to a mock send when credentials are unset — never crashes, never calls the network", async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_INVOICE_TEMPLATE_NAME;
    const fetchImpl = vi.fn();
    const result = await sendWhatsAppInvoice(input, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ sent: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("falls back to a mock send when only some credentials are set (partial config is treated as unconfigured)", async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    const fetchImpl = vi.fn();
    const result = await sendWhatsAppInvoice(input, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ sent: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uploads the PDF as media, then sends a template message referencing it, and returns the real message id", async () => {
    setCreds();
    const fetchImpl = vi
      .fn()
      // 1. media upload
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "media-abc-123" }), { status: 200 }))
      // 2. template message send
      .mockResolvedValueOnce(new Response(JSON.stringify({ messages: [{ id: "wamid.XYZ" }] }), { status: 200 }));

    const result = await sendWhatsAppInvoice(input, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ sent: true, messageId: "wamid.XYZ", provider: "meta" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const [mediaCall, messageCall] = fetchImpl.mock.calls;
    expect(String(mediaCall[0])).toContain("/1234567890/media");
    expect(String(messageCall[0])).toContain("/1234567890/messages");
    const messageBody = JSON.parse((messageCall[1] as RequestInit).body as string);
    expect(messageBody.to).toBe(input.to);
    expect(messageBody.template.name).toBe("invoice_delivery");
    expect(messageBody.template.components[0].parameters[0].document.id).toBe("media-abc-123");
  });

  it("a failed media upload never reaches the message-send step, and reports not sent", async () => {
    setCreds();
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response("bad request", { status: 400 }));
    const result = await sendWhatsAppInvoice(input, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ sent: false });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("a failed template-message send reports not sent, even though the media upload succeeded", async () => {
    setCreds();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "media-abc-123" }), { status: 200 }))
      .mockResolvedValueOnce(new Response("template not approved", { status: 400 }));
    const result = await sendWhatsAppInvoice(input, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ sent: false });
  });

  it("a network error is caught, not thrown — the caller must never crash on a delivery failure", async () => {
    setCreds();
    const fetchImpl = vi.fn().mockRejectedValueOnce(new Error("ECONNRESET"));
    const result = await sendWhatsAppInvoice(input, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ sent: false });
  });
});

describe("provider selection (2026-08-19 — OpenWA added alongside Meta)", () => {
  it("is null/unconfigured when neither provider's env vars are set", () => {
    expect(activeWhatsAppProvider()).toBeNull();
    expect(isWhatsAppProviderConfigured()).toBe(false);
  });

  it("picks OpenWA when only OpenWA is configured", () => {
    setOpenWaCreds();
    expect(activeWhatsAppProvider()).toBe("openwa");
    expect(isWhatsAppProviderConfigured()).toBe(true);
  });

  it("picks Meta when only Meta is configured", () => {
    setCreds();
    expect(activeWhatsAppProvider()).toBe("meta");
  });

  it("prefers Meta over OpenWA when both are configured — the compliance-grade path wins automatically", () => {
    setCreds();
    setOpenWaCreds();
    expect(activeWhatsAppProvider()).toBe("meta");
  });

  it("WHATSAPP_PROVIDER forces the choice even when both are configured", () => {
    setCreds();
    setOpenWaCreds();
    process.env.WHATSAPP_PROVIDER = "openwa";
    expect(activeWhatsAppProvider()).toBe("openwa");
  });

  it("actually dispatches to OpenWA's send-document endpoint when OpenWA is the active provider", async () => {
    setOpenWaCreds();
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ messageId: "true_628@c.us_XYZ", timestamp: 1 }), { status: 201 }),
    );
    const result = await sendWhatsAppInvoice(input, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ sent: true, messageId: "true_628@c.us_XYZ", provider: "openwa" });
    expect(String(fetchImpl.mock.calls[0][0])).toContain("/sessions/session-abc/messages/send-document");
  });
});
