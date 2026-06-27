/**
 * Minimal OpenRouter client (OpenAI-compatible). Uses free models by default
 * (NVIDIA Nemotron, OpenAI gpt-oss) and lists a fallback so a rate-limited
 * free model degrades gracefully instead of failing the request.
 */

const BASE_URL = "https://openrouter.ai/api/v1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function isConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

/** Primary model first, then the fallback, for OpenRouter's `models` routing.
 *  An explicit `override` (e.g. user-selected model) is tried first. */
function modelList(override?: string): string[] {
  const primary = override || process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free";
  const fallback = process.env.OPENROUTER_FALLBACK_MODEL || "openai/gpt-oss-20b:free";
  return primary === fallback ? [primary] : [primary, fallback];
}

/** Shared request body. `reasoning.effort: low` keeps free reasoning models from
 *  burning their whole token budget on hidden chain-of-thought before answering. */
function requestBody(messages: ChatMessage[], stream: boolean, maxTokens: number, model?: string) {
  return JSON.stringify({
    models: modelList(model),
    messages,
    stream,
    max_tokens: maxTokens,
    reasoning: { effort: "low" },
  });
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
    "X-Title": "FatooraLite",
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}
export interface AssistantMessage {
  role: "assistant";
  content: string | null;
  tool_calls?: ToolCall[];
}

/**
 * Tool-calling completion. Sends the conversation plus tool schemas and returns
 * the assistant message, which may contain `tool_calls` to execute.
 */
export async function chatWithTools(
  messages: unknown[],
  tools: unknown[],
  model?: string,
  maxTokens = 1024,
  toolChoice: "auto" | "required" = "auto",
): Promise<AssistantMessage> {
  const body = JSON.stringify({
    models: modelList(model),
    messages,
    tools,
    tool_choice: toolChoice,
    stream: false,
    max_tokens: maxTokens,
    reasoning: { effort: "low" },
  });

  // Free models are intermittently rate-limited upstream; retry once briefly.
  let data: { choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[]; error?: { code?: number } } | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${BASE_URL}/chat/completions`, { method: "POST", headers: headers(), body });
    data = await res.json().catch(() => null);
    if (res.ok && data?.choices?.length) break;
    const rateLimited = res.status === 429 || data?.error?.code === 429;
    if (attempt === 0 && rateLimited) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  }

  const m = data?.choices?.[0]?.message ?? {};
  return { role: "assistant", content: m.content ?? null, tool_calls: m.tool_calls };
}

/** Non-streaming completion. Returns the assistant text (or throws). */
export async function chatText(messages: ChatMessage[], maxTokens = 1024): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: requestBody(messages, false, maxTokens),
  });
  if (!res.ok) {
    throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

/**
 * Streaming completion. Returns a ReadableStream of plain UTF-8 text tokens
 * (the SSE framing and JSON envelopes are stripped here so the client just
 * appends raw text).
 */
export async function chatStream(messages: ChatMessage[], maxTokens = 1024, model?: string): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: requestBody(messages, true, maxTokens, model),
  });
  if (!res.ok || !res.body) {
    throw new Error(`OpenRouter ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  }

  const upstream = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  // IMPORTANT (Next.js route streaming contract): every `pull` must either
  // enqueue at least one chunk or close the stream. OpenRouter emits SSE
  // keep-alive comments (": OPENROUTER PROCESSING") and reasoning-only deltas
  // that carry no content — so we loop here until we actually have a token to
  // emit (or the upstream ends). Returning from `pull` without enqueuing/closing
  // stalls the consumer and the response hangs.
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      for (;;) {
        const { done, value } = await upstream.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newlines.
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        let emitted = false;
        for (const event of events) {
          for (const line of event.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(payload);
              const token = json.choices?.[0]?.delta?.content;
              if (token) {
                controller.enqueue(encoder.encode(token));
                emitted = true;
              }
            } catch {
              /* partial JSON — keep it buffered for the next chunk */
            }
          }
        }
        if (emitted) return;
      }
    },
    cancel() {
      upstream.cancel().catch(() => {});
    },
  });
}
