import type { ChatProvider } from "../provider";
import { OpenAICompatProvider } from "./openai-compat";

/**
 * Groq (GroqCloud). OpenAI-compatible Chat Completions on custom LPU
 * inference hardware — the point of it here is latency: token throughput is
 * high enough that the assistant answers and executes tools fast enough to
 * demo live, which the free OpenRouter models are not reliably able to do.
 *
 * Activate with AI_PROVIDER=groq + GROQ_API_KEY; model via AI_MODEL or
 * GROQ_MODEL.
 *
 * Note this is Groq (groq.com, inference hosting), not xAI's Grok model.
 *
 * No fallback model is configured: `useModelsArray` is an OpenRouter routing
 * feature and Groq's API takes a single `model`, so a second entry would be
 * silently dropped. If the default model is decommissioned, set GROQ_MODEL.
 *
 * The default must support tool calling — the assistant's whole value here is
 * executing lib/ai/tools.ts against the tenant, not just chatting. Check
 * https://console.groq.com/docs/models before changing it.
 */
export function createGroqProvider(): ChatProvider {
  return new OpenAICompatProvider({
    name: "groq",
    baseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
    apiKey: () => process.env.GROQ_API_KEY,
    defaultModel: () => process.env.AI_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  });
}
