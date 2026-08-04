import { afterEach, describe, expect, it } from "vitest";
import { createGroqProvider } from "./groq";

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("createGroqProvider", () => {
  it("identifies itself as groq", () => {
    expect(createGroqProvider().name).toBe("groq");
  });

  it("is unconfigured without GROQ_API_KEY, so the caller falls back to mock mode", () => {
    delete process.env.GROQ_API_KEY;
    expect(createGroqProvider().isConfigured()).toBe(false);
  });

  it("is configured once GROQ_API_KEY is present", () => {
    process.env.GROQ_API_KEY = "gsk_test";
    expect(createGroqProvider().isConfigured()).toBe(true);
  });

  it("reads the key lazily, so a key set after construction still counts", () => {
    delete process.env.GROQ_API_KEY;
    const provider = createGroqProvider();
    expect(provider.isConfigured()).toBe(false);
    process.env.GROQ_API_KEY = "gsk_test";
    expect(provider.isConfigured()).toBe(true);
  });
});
