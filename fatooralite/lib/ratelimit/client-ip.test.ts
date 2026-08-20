import { describe, it, expect, afterEach } from "vitest";
import { clientIpFor } from "./client-ip";

function headers(init: Record<string, string>): Headers {
  return new Headers(init);
}

afterEach(() => {
  delete process.env.TRUSTED_PROXY_HOPS;
});

describe("clientIpFor", () => {
  it("returns the only address when the platform sets a single entry", () => {
    expect(clientIpFor(headers({ "x-forwarded-for": "203.0.113.10" }))).toBe("203.0.113.10");
  });

  it("ignores an address the caller prepended to the chain", () => {
    // The attack: the client sends its own X-Forwarded-For and the proxy
    // appends the real address. Reading left to right would hand the caller a
    // bucket key of its own choosing; reading from the right does not.
    expect(clientIpFor(headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.10" }))).toBe("203.0.113.10");
  });

  it("gives every spoofed chain the same key, so the limit still applies", () => {
    const a = clientIpFor(headers({ "x-forwarded-for": "10.0.0.1, 203.0.113.10" }));
    const b = clientIpFor(headers({ "x-forwarded-for": "10.0.0.2, 203.0.113.10" }));
    const c = clientIpFor(headers({ "x-forwarded-for": "9.9.9.9, 8.8.8.8, 203.0.113.10" }));
    expect(new Set([a, b, c]).size).toBe(1);
  });

  it("steps left by the configured number of trusted hops", () => {
    process.env.TRUSTED_PROXY_HOPS = "2";
    expect(clientIpFor(headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.10, 10.0.0.5" }))).toBe("203.0.113.10");
  });

  it("never steps past the start of the chain", () => {
    process.env.TRUSTED_PROXY_HOPS = "9";
    expect(clientIpFor(headers({ "x-forwarded-for": "203.0.113.10" }))).toBe("203.0.113.10");
  });

  it("falls back to x-real-ip, then to a constant", () => {
    expect(clientIpFor(headers({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(clientIpFor(headers({}))).toBe("127.0.0.1");
  });

  it("ignores an empty or whitespace-only forwarded chain", () => {
    expect(clientIpFor(headers({ "x-forwarded-for": " , ", "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
  });
});
