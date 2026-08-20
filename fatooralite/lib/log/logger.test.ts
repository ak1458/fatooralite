import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { log, loggerFor } from "./logger";
import { REQUEST_ID_HEADER } from "./request-id";

/**
 * Phase 2 / W4. Two things must hold for every log line, always:
 *  1. it is a single parseable JSON line (Vercel's log pipeline is line-based)
 *  2. nothing that looks like a secret ever reaches stdout — this is the
 *     regression gate for A-081 ("sensitive information excluded from logs"),
 *     now extended from the security-event trail to structured logs too.
 */
describe("structured logger", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });

  function lastLine(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
    const call = spy.mock.calls.at(-1);
    return JSON.parse(call![0] as string);
  }

  it("emits one parseable JSON line with ts/level/event", () => {
    log.info("invoice.submitted", { invoiceId: "inv-1" });
    const line = lastLine(infoSpy);
    expect(line.level).toBe("info");
    expect(line.event).toBe("invoice.submitted");
    expect(typeof line.ts).toBe("string");
    expect(line.invoiceId).toBe("inv-1");
  });

  it("redacts sensitive-looking keys (password, token, secret, authorization)", () => {
    log.info("test.event", {
      password: "hunter2",
      apiToken: "sk-live-abc123",
      csidSecret: "shh",
      authorization: "Bearer xyz",
      userId: "u-1", // not sensitive — should pass through
    });
    const line = lastLine(infoSpy);
    expect(line.password).toBe("[redacted]");
    expect(line.apiToken).toBe("[redacted]");
    expect(line.csidSecret).toBe("[redacted]");
    expect(line.authorization).toBe("[redacted]");
    expect(line.userId).toBe("u-1");
    expect(JSON.stringify(line)).not.toContain("hunter2");
    expect(JSON.stringify(line)).not.toContain("sk-live-abc123");
  });

  it("clamps very long string values instead of dumping them whole", () => {
    log.info("test.event", { blob: "x".repeat(5000) });
    const line = lastLine(infoSpy);
    expect((line.blob as string).length).toBeLessThan(300);
  });

  it("child() merges context into every subsequent call", () => {
    const child = log.child({ requestId: "req-123", companyId: "co-1" });
    child.info("test.event", { extra: "field" });
    const line = lastLine(infoSpy);
    expect(line.requestId).toBe("req-123");
    expect(line.companyId).toBe("co-1");
    expect(line.extra).toBe("field");
  });

  it("loggerFor(req) picks up the correlation id from the request header", () => {
    const req = new Request("http://localhost/api/x", { headers: { [REQUEST_ID_HEADER]: "corr-abc" } });
    loggerFor(req).info("test.event");
    const line = lastLine(infoSpy);
    expect(line.requestId).toBe("corr-abc");
  });

  it("never throws on a circular object, and never crashes the caller", () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    expect(() => log.error("test.event", { circular })).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();
  });
});
