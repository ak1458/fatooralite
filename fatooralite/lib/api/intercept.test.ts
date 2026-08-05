import { afterEach, describe, expect, it, vi } from "vitest";
import { installApiInterceptor, type ApiRefusal } from "./intercept";

const original = window.fetch;
let uninstall: (() => void) | null = null;

afterEach(() => {
  uninstall?.();
  uninstall = null;
  window.fetch = original;
});

function stub(status: number, body: unknown = {}) {
  window.fetch = vi.fn(async () => new Response(JSON.stringify(body), { status })) as typeof window.fetch;
}

function install() {
  const seen: ApiRefusal[] = [];
  uninstall = installApiInterceptor((r) => seen.push(r));
  return seen;
}

/** The listener fires from a floating promise, so let the microtask queue drain. */
const settle = () => new Promise((r) => setTimeout(r, 0));

describe("installApiInterceptor", () => {
  it("reports a 402 with its message and upgrade URL", async () => {
    stub(402, { error: "Trial limit reached — 25 invoices this month.", upgradeUrl: "/settings?tab=billing", feature: "issueInvoice" });
    const seen = install();
    await window.fetch("/api/invoices", { method: "POST" });
    await settle();
    expect(seen).toEqual([
      {
        status: 402,
        message: "Trial limit reached — 25 invoices this month.",
        upgradeUrl: "/settings?tab=billing",
        feature: "issueInvoice",
      },
    ]);
  });

  it("reports a 401 from an API route", async () => {
    stub(401, { error: "Authentication required" });
    const seen = install();
    await window.fetch("/api/companies");
    await settle();
    expect(seen).toEqual([{ status: 401, message: "Authentication required", upgradeUrl: undefined, feature: undefined }]);
  });

  // A wrong password is an ordinary 401 on this route. Treating it as an
  // expired session would redirect the user off the login page they are on.
  it("ignores a 401 from /api/auth/*", async () => {
    stub(401, { error: "Invalid credentials" });
    const seen = install();
    await window.fetch("/api/auth/login", { method: "POST" });
    await settle();
    expect(seen).toEqual([]);
  });

  it("ignores non-API URLs", async () => {
    stub(401);
    const seen = install();
    await window.fetch("/login");
    await window.fetch("https://example.test/whatever");
    await settle();
    expect(seen).toEqual([]);
  });

  it.each([200, 201, 400, 403, 404, 409, 422, 500])("ignores status %i", async (status) => {
    stub(status);
    const seen = install();
    await window.fetch("/api/invoices");
    await settle();
    expect(seen).toEqual([]);
  });

  // The assistant streams its reply; draining the body here would break it.
  it("leaves the response body readable by the caller", async () => {
    stub(402, { error: "nope" });
    install();
    const res = await window.fetch("/api/invoices", { method: "POST" });
    expect(res.bodyUsed).toBe(false);
    await expect(res.json()).resolves.toEqual({ error: "nope" });
  });

  it("still reports a refusal whose body is not JSON", async () => {
    window.fetch = vi.fn(async () => new Response("<html>gateway</html>", { status: 402 })) as typeof window.fetch;
    const seen = install();
    await window.fetch("/api/invoices");
    await settle();
    expect(seen).toEqual([{ status: 402 }]);
  });

  it("returns the original response object untouched", async () => {
    const response = new Response("{}", { status: 402 });
    window.fetch = vi.fn(async () => response) as typeof window.fetch;
    install();
    expect(await window.fetch("/api/invoices")).toBe(response);
  });

  it("patches only once and restores the original on uninstall", async () => {
    const stubbed = vi.fn(async () => new Response("{}", { status: 200 })) as typeof window.fetch;
    window.fetch = stubbed;
    const first = installApiInterceptor(() => {});
    const patched = window.fetch;
    const second = installApiInterceptor(() => {});
    expect(window.fetch).toBe(patched);
    second();
    first();
    expect(window.fetch).toBe(stubbed);
  });

  it("accepts a Request object as input", async () => {
    stub(402, { error: "locked" });
    const seen = install();
    await window.fetch(new Request("http://localhost/api/branches", { method: "POST" }));
    await settle();
    expect(seen[0]).toMatchObject({ status: 402, message: "locked" });
  });
});
