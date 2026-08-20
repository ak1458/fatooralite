import type {
  AssistantMessage,
  ChatMessage,
  ChatOptions,
  ChatProvider,
  ToolCall,
  ToolSchema,
} from "../provider";

/**
 * Generic adapter for any OpenAI-compatible Chat Completions endpoint.
 * OpenRouter and OpenAI are both instances of this class with different
 * base URLs, keys, and model-routing behaviour.
 */
export interface OpenAICompatConfig {
  name: string;
  baseUrl: string;
  apiKey: () => string | undefined;
  defaultModel: () => string;
  fallbackModel?: () => string | undefined;
  extraHeaders?: () => Record<string, string>;
  /** OpenRouter's `models` array routing (primary + fallback in one request). */
  useModelsArray?: boolean;
  /** Keep free reasoning models from burning their budget on hidden CoT. */
  lowReasoningEffort?: boolean;
}

interface CompletionChoice {
  message?: { content?: string | null; tool_calls?: ToolCall[] };
}

interface CompletionUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

export class OpenAICompatProvider implements ChatProvider {
  readonly name: string;

  constructor(private cfg: OpenAICompatConfig) {
    this.name = cfg.name;
  }

  isConfigured(): boolean {
    return !!this.cfg.apiKey();
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.cfg.apiKey()}`,
      "Content-Type": "application/json",
      ...(this.cfg.extraHeaders?.() ?? {}),
    };
  }

  private modelFields(override?: string): Record<string, unknown> {
    const primary = override || this.cfg.defaultModel();
    const fallback = this.cfg.fallbackModel?.();
    if (this.cfg.useModelsArray && fallback && fallback !== primary) {
      return { models: [primary, fallback] };
    }
    return { model: primary };
  }

  private body(
    messages: ChatMessage[],
    stream: boolean,
    opts?: ChatOptions,
    tools?: ToolSchema[],
  ): string {
    return JSON.stringify({
      ...this.modelFields(opts?.model),
      messages,
      stream,
      max_tokens: opts?.maxTokens ?? 1024,
      ...(tools && tools.length > 0
        ? { tools, tool_choice: opts?.toolChoice === "required" ? "required" : "auto" }
        : {}),
      ...(this.cfg.lowReasoningEffort ? { reasoning: { effort: "low" } } : {}),
    });
  }

  async chatWithTools(
    messages: ChatMessage[],
    tools: ToolSchema[],
    opts?: ChatOptions,
  ): Promise<AssistantMessage> {
    let body = this.body(messages, false, opts, tools);

    // Free/shared models are intermittently rate-limited upstream; retry once.
    let data: { choices?: CompletionChoice[]; error?: { code?: number }; usage?: CompletionUsage } | null = null;
    let relaxedToolChoice = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.headers(),
        body,
      });
      data = await res.json().catch(() => null);
      if (res.ok && data?.choices?.length) break;
      const rateLimited = res.status === 429 || data?.error?.code === 429;
      if (attempt < 2 && rateLimited) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }

      // Not every model supports an enforced tool_choice. OpenRouter's
      // models-array routing can also land on a fallback that does not, even
      // when the primary does — which is how this surfaced: a 400 reading
      // 'inference-enforced tool_choice (required/named) is not supported for
      // model "gpt-oss-20b"'. Forcing a tool call is an optimisation to stop
      // weaker models replying "done" without acting; losing the whole request
      // over it is far worse than falling back to "auto".
      if (!res.ok && !relaxedToolChoice && /tool_choice/i.test(JSON.stringify(data ?? {}))) {
        relaxedToolChoice = true;
        body = this.body(messages, false, { ...opts, toolChoice: "auto" }, tools);
        continue;
      }
      // Report the provider's own message. This threw a bare "openrouter 400",
      // the least diagnosable failure in the app — tool calling is precisely
      // where a provider rejects a request (model without tool support, schema
      // it dislikes) and the reason was being discarded. The body is read from
      // the already-parsed `data`, not res.text(): the stream is consumed by
      // the res.json() above, so re-reading it yields an empty string.
      if (!res.ok) {
        throw new Error(`${this.name} ${res.status}: ${JSON.stringify(data ?? {}).slice(0, 400)}`);
      }
    }

    const m = data?.choices?.[0]?.message ?? {};
    const usage =
      typeof data?.usage?.prompt_tokens === "number" && typeof data?.usage?.completion_tokens === "number"
        ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
        : undefined;
    return { role: "assistant", content: m.content ?? null, tool_calls: m.tool_calls, usage };
  }

  async chatText(messages: ChatMessage[], opts?: ChatOptions): Promise<string> {
    const res = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: this.body(messages, false, opts),
    });
    if (!res.ok) {
      throw new Error(`${this.name} ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  }

  async chatStream(
    messages: ChatMessage[],
    opts?: ChatOptions,
  ): Promise<ReadableStream<Uint8Array>> {
    const res = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: this.body(messages, true, opts),
    });
    if (!res.ok || !res.body) {
      throw new Error(`${this.name} ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
    }

    const upstream = res.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";

    // IMPORTANT (Next.js route streaming contract): every `pull` must either
    // enqueue at least one chunk or close the stream. Providers emit SSE
    // keep-alive comments and reasoning-only deltas that carry no content —
    // so we loop here until we actually have a token to emit (or the
    // upstream ends). Returning from `pull` without enqueuing/closing stalls
    // the consumer and the response hangs.
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
}
