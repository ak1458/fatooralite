import { afterEach, describe, expect, it } from "vitest";

describe("appUrl", () => {
  const originalNextPublic = process.env.NEXT_PUBLIC_APP_URL;
  const originalApp = process.env.APP_URL;

  afterEach(() => {
    if (originalNextPublic === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = originalNextPublic;
    if (originalApp === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = originalApp;
  });

  async function freshAppUrl() {
    // appUrl() reads process.env at call time (no module-level caching), so a
    // fresh import isn't required — but keep the pattern consistent in case
    // that ever changes.
    const mod = await import("./appUrl");
    return mod.appUrl;
  }

  it("prefers NEXT_PUBLIC_APP_URL over APP_URL", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://public.example.com";
    process.env.APP_URL = "https://server.example.com";
    const appUrl = await freshAppUrl();
    expect(appUrl()).toBe("https://public.example.com");
  });

  it("falls back to APP_URL when NEXT_PUBLIC_APP_URL is unset", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.APP_URL = "https://server.example.com";
    const appUrl = await freshAppUrl();
    expect(appUrl()).toBe("https://server.example.com");
  });

  it("falls back to localhost when neither is set", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
    const appUrl = await freshAppUrl();
    expect(appUrl()).toBe("http://localhost:3000");
  });

  it("strips trailing slashes", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://public.example.com/";
    const appUrl = await freshAppUrl();
    expect(appUrl()).toBe("https://public.example.com");
  });

  it("strips multiple trailing slashes", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://public.example.com///";
    const appUrl = await freshAppUrl();
    expect(appUrl()).toBe("https://public.example.com");
  });
});
