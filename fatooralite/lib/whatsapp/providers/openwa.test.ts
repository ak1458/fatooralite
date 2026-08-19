import { describe, it, expect, afterEach, vi } from "vitest";
import { sendViaOpenWa, getOpenWaSessionStatus, isOpenWaConfigured } from "./openwa";

const ORIGINAL_ENV = { ...process.env };

function setCreds() {
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

describe("isOpenWaConfigured", () => {
  it("is false unless all three of URL, key, and session id are set", () => {
    delete process.env.OPENWA_API_URL;
    delete process.env.OPENWA_API_KEY;
    delete process.env.OPENWA_SESSION_ID;
    expect(isOpenWaConfigured()).toBe(false);
    process.env.OPENWA_API_URL = "http://localhost:2785/api";
    expect(isOpenWaConfigured()).toBe(false);
    setCreds();
    expect(isOpenWaConfigured()).toBe(true);
  });
});

describe("sendViaOpenWa", () => {
  it("POSTs to the documented send-document endpoint with the exact OpenWA payload shape", async () => {
    setCreds();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ messageId: "true_628@c.us_ABC", timestamp: 123 }), { status: 201 }));

    const result = await sendViaOpenWa(input, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ sent: true, messageId: "true_628@c.us_ABC", provider: "openwa" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [url, opts] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:2785/api/sessions/session-abc/messages/send-document");
    expect((opts.headers as Record<string, string>)["X-API-Key"]).toBe("test-openwa-key");

    const body = JSON.parse(opts.body as string);
    // chatId: E.164 "+966500000000" -> digits-only "966500000000@c.us" per OpenWA's documented shape.
    expect(body.chatId).toBe("966500000000@c.us");
    expect(body.mimetype).toBe("application/pdf");
    expect(body.filename).toBe(input.filename);
    expect(body.base64).toBe(Buffer.from(input.pdfBytes).toString("base64"));
    expect(body.caption).toContain(input.invoiceNumber);
    expect(body.caption).toContain(input.sellerName);
    expect(body.caption).toContain(input.grandTotal);
    expect(body.url).toBeUndefined();
  });

  it("reports not-sent on a non-2xx response, without throwing", async () => {
    setCreds();
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response("session not ready", { status: 409 }));
    const result = await sendViaOpenWa(input, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ sent: false });
  });

  it("reports not-sent when the response is 2xx but carries no messageId — never claims success without confirmation", async () => {
    setCreds();
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 201 }));
    const result = await sendViaOpenWa(input, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ sent: false });
  });

  it("never includes the API key in the request body (it's a header only)", async () => {
    setCreds();
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ messageId: "x" }), { status: 201 }));
    await sendViaOpenWa(input, fetchImpl as unknown as typeof fetch);
    const [, opts] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(opts.body as string).not.toContain("test-openwa-key");
  });
});

describe("getOpenWaSessionStatus", () => {
  it("reports unconfigured without ever calling the network when env vars are unset", async () => {
    delete process.env.OPENWA_API_URL;
    delete process.env.OPENWA_API_KEY;
    delete process.env.OPENWA_SESSION_ID;
    const fetchImpl = vi.fn();
    const status = await getOpenWaSessionStatus(fetchImpl as unknown as typeof fetch);
    expect(status).toEqual({ configured: false, available: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports available:true only when the session's own status is exactly 'ready'", async () => {
    setCreds();
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "session-abc", status: "ready", engineLoaded: true }), { status: 200 }),
    );
    const status = await getOpenWaSessionStatus(fetchImpl as unknown as typeof fetch);
    expect(status).toEqual({ configured: true, available: true, status: "ready" });
  });

  it("reports available:false for any non-ready status (e.g. qr_ready, disconnected)", async () => {
    setCreds();
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "qr_ready" }), { status: 200 }),
    );
    const status = await getOpenWaSessionStatus(fetchImpl as unknown as typeof fetch);
    expect(status).toEqual({ configured: true, available: false, status: "qr_ready" });
  });

  it("reports available:false, not a thrown error, when the session endpoint 404s", async () => {
    setCreds();
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response("not found", { status: 404 }));
    const status = await getOpenWaSessionStatus(fetchImpl as unknown as typeof fetch);
    expect(status).toEqual({ configured: true, available: false, error: "HTTP 404" });
  });

  it("reports available:false, not a thrown error, on a network failure (provider unreachable)", async () => {
    setCreds();
    const fetchImpl = vi.fn().mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const status = await getOpenWaSessionStatus(fetchImpl as unknown as typeof fetch);
    expect(status.configured).toBe(true);
    expect(status.available).toBe(false);
    expect(status.error).toContain("ECONNREFUSED");
  });
});
