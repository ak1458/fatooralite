import type { ChatProvider } from "../provider";
import { OpenAICompatProvider } from "./openai-compat";

/**
 * OpenAI (enterprise path). Activate with AI_PROVIDER=openai + OPENAI_API_KEY;
 * model via AI_MODEL or OPENAI_MODEL.
 */
export function createOpenAIProvider(): ChatProvider {
  return new OpenAICompatProvider({
    name: "openai",
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    apiKey: () => process.env.OPENAI_API_KEY,
    defaultModel: () => process.env.AI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
  });
}
