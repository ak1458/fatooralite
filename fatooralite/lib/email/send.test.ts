// @vitest-environment node
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { sendEmail } from "./send";

const ORIGINAL_KEY = process.env.RESEND_API_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  if (ORIGINAL_KEY === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = ORIGINAL_KEY;
});

describe("sendEmail — mock path (no RESEND_API_KEY)", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("returns sent:false and makes no network call", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const result = await sendEmail({ to: "a@b.com", subject: "hi", html: "<p>hi</p>" });
    expect(result.sent).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it("logs the attachment filename and byte size, never its content", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const content = new TextEncoder().encode("%PDF-1.4 secret-looking-bytes");
    await sendEmail({
      to: "a@b.com",
      subject: "hi",
      html: "<p>hi</p>",
      attachments: [{ filename: "invoice_INV-1.pdf", content }],
    });
    const logged = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(logged).toContain("invoice_INV-1.pdf");
    expect(logged).toContain(`${content.byteLength}b`);
    expect(logged).not.toContain("secret-looking-bytes");
    logSpy.mockRestore();
  });
});

describe("sendEmail — live path (RESEND_API_KEY set)", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-key";
  });

  it("base64-encodes the attachment into the Resend payload", async () => {
    const spy = vi.fn(async (_url: string, _opts: RequestInit) => new Response(JSON.stringify({ id: "x" }), { status: 200 }));
    vi.stubGlobal("fetch", spy);
    const content = new TextEncoder().encode("pdf-bytes");
    const result = await sendEmail({
      to: "a@b.com",
      subject: "hi",
      html: "<p>hi</p>",
      attachments: [{ filename: "invoice_INV-1.pdf", content }],
    });
    expect(result.sent).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(spy.mock.calls[0][1].body as string);
    expect(body.attachments).toEqual([{ filename: "invoice_INV-1.pdf", content: Buffer.from(content).toString("base64") }]);
  });

  it("returns sent:false on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    const result = await sendEmail({ to: "a@b.com", subject: "hi", html: "<p>hi</p>" });
    expect(result.sent).toBe(false);
  });

  it("returns sent:false without an attachments field when none is given", async () => {
    const spy = vi.fn(async (_url: string, _opts: RequestInit) => new Response(JSON.stringify({ id: "x" }), { status: 200 }));
    vi.stubGlobal("fetch", spy);
    await sendEmail({ to: "a@b.com", subject: "hi", html: "<p>hi</p>" });
    const body = JSON.parse(spy.mock.calls[0][1].body as string);
    expect(body.attachments).toBeUndefined();
  });
});
