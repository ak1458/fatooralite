import type { ChatProvider } from "../provider";
import { OpenAICompatProvider } from "./openai-compat";

/**
 * OpenRouter (default provider during development). Uses free models with a
 * fallback so a rate-limited free model degrades gracefully instead of
 * failing the request.
 */
export function createOpenRouterProvider(): ChatProvider {
  return new OpenAICompatProvider({
    name: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: () => process.env.OPENROUTER_API_KEY,
    defaultModel: () =>
      process.env.AI_MODEL || process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free",
    fallbackModel: () =>
      process.env.AI_FALLBACK_MODEL || process.env.OPENROUTER_FALLBACK_MODEL || "openai/gpt-oss-20b:free",
    extraHeaders: () => ({
      "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
      "X-Title": "FatooraLite",
    }),
    useModelsArray: true,
    lowReasoningEffort: true,
  });
}
