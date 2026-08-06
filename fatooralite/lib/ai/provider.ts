/**
 * Provider-agnostic AI layer. The app talks to this module only; the concrete
 * backend (OpenRouter today, Anthropic or OpenAI when enterprise keys arrive)
 * is selected by the AI_PROVIDER env var with zero call-site changes:
 *
 *   AI_PROVIDER=openrouter (default) — OpenAI-compatible, free-model routing
 *   AI_PROVIDER=groq                 — GroqCloud, OpenAI-compatible, low latency
 *   AI_PROVIDER=anthropic            — official @anthropic-ai/sdk (Messages API)
 *   AI_PROVIDER=openai               — OpenAI Chat Completions
 *
 * The internal wire format is OpenAI-style (roles, tool_calls with JSON-string
 * arguments) because the tool registry (lib/ai/tools.ts) already speaks it;
 * adapters translate where the provider differs (Anthropic tool_use blocks).
 */

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  /** Present on assistant messages that requested tool executions. */
  tool_calls?: ToolCall[];
  /** Present on role:"tool" messages — the call this result answers. */
  tool_call_id?: string;
}

export interface ToolSchema {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface AssistantMessage {
  role: "assistant";
  content: string | null;
  tool_calls?: ToolCall[];
}

export interface ChatOptions {
  /** Per-request model override (else the provider's env-configured default). */
  model?: string;
  maxTokens?: number;
  /** "required" forces at least one tool call (mapped per provider). */
  toolChoice?: "auto" | "required";
}

export interface ChatProvider {
  readonly name: string;
  isConfigured(): boolean;
  chatWithTools(messages: ChatMessage[], tools: ToolSchema[], opts?: ChatOptions): Promise<AssistantMessage>;
  chatText(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
  /** Plain UTF-8 token stream (SSE framing already stripped). */
  chatStream(messages: ChatMessage[], opts?: ChatOptions): Promise<ReadableStream<Uint8Array>>;
}

import { createOpenRouterProvider } from "./providers/openrouter";
import { createOpenAIProvider } from "./providers/openai";
import { createAnthropicProvider } from "./providers/anthropic";
import { createGroqProvider } from "./providers/groq";

let cached: ChatProvider | null = null;
let cachedName: string | null = null;

export function getChatProvider(): ChatProvider {
  const name = (process.env.AI_PROVIDER || "openrouter").toLowerCase();
  if (cached && cachedName === name) return cached;
  cachedName = name;
  switch (name) {
    case "anthropic":
      cached = createAnthropicProvider();
      break;
    case "openai":
      cached = createOpenAIProvider();
      break;
    case "groq":
      cached = createGroqProvider();
      break;
    case "openrouter":
      cached = createOpenRouterProvider();
      break;
    default:
      throw new Error(
        `Unknown AI_PROVIDER "${name}" (expected openrouter | groq | anthropic | openai)`,
      );
  }
  return cached;
}

// ---- Convenience wrappers (stable call-site API) ---------------------------

export function isConfigured(): boolean {
  return getChatProvider().isConfigured();
}

export function chatText(messages: ChatMessage[], maxTokens = 1024): Promise<string> {
  return getChatProvider().chatText(messages, { maxTokens });
}

export function chatStream(
  messages: ChatMessage[],
  maxTokens = 1024,
  model?: string,
): Promise<ReadableStream<Uint8Array>> {
  return getChatProvider().chatStream(messages, { maxTokens, model });
}

export function chatWithTools(
  messages: ChatMessage[],
  tools: ToolSchema[],
  model?: string,
  maxTokens = 1024,
  toolChoice: "auto" | "required" = "auto",
): Promise<AssistantMessage> {
  return getChatProvider().chatWithTools(messages, tools, { model, maxTokens, toolChoice });
}
