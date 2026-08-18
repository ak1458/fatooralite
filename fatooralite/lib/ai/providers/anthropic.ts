import Anthropic from "@anthropic-ai/sdk";
import type {
  AssistantMessage,
  ChatMessage,
  ChatOptions,
  ChatProvider,
  ToolCall,
  ToolSchema,
} from "../provider";

/**
 * Anthropic adapter (enterprise path). Activate with AI_PROVIDER=anthropic +
 * ANTHROPIC_API_KEY; model via AI_MODEL or ANTHROPIC_MODEL.
 *
 * Translates the app's OpenAI-style wire format to the Messages API:
 * - system messages -> the `system` parameter
 * - assistant tool_calls -> `tool_use` content blocks
 * - role:"tool" results  -> `tool_result` blocks, batched into ONE user
 *   message per assistant turn (the API requires all results together)
 * - tool schemas -> { name, description, input_schema }
 */

const DEFAULT_MODEL = "claude-opus-4-8";

function model(override?: string): string {
  return override || process.env.AI_MODEL || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
}

function toAnthropicMessages(messages: ChatMessage[]): {
  system: string | undefined;
  converted: Anthropic.MessageParam[];
} {
  const systemParts: string[] = [];
  const converted: Anthropic.MessageParam[] = [];
  let pendingResults: Anthropic.ToolResultBlockParam[] = [];

  const flushResults = () => {
    if (pendingResults.length > 0) {
      converted.push({ role: "user", content: pendingResults });
      pendingResults = [];
    }
  };

  for (const m of messages) {
    if (m.role === "system") {
      systemParts.push(m.content ?? "");
      continue;
    }
    if (m.role === "tool") {
      pendingResults.push({
        type: "tool_result",
        tool_use_id: m.tool_call_id ?? "",
        content: m.content ?? "",
      });
      continue;
    }
    flushResults();
    if (m.role === "assistant" && m.tool_calls && m.tool_calls.length > 0) {
      const blocks: Anthropic.ContentBlockParam[] = [];
      if (m.content) blocks.push({ type: "text", text: m.content });
      for (const call of m.tool_calls) {
        let input: unknown = {};
        try {
          input = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        } catch {
          /* leave as empty object; server-side zod validation reports it */
        }
        blocks.push({ type: "tool_use", id: call.id, name: call.function.name, input });
      }
      converted.push({ role: "assistant", content: blocks });
    } else {
      converted.push({ role: m.role, content: m.content ?? "" });
    }
  }
  flushResults();

  return { system: systemParts.length > 0 ? systemParts.join("\n\n") : undefined, converted };
}

function toAnthropicTools(tools: ToolSchema[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters as Anthropic.Tool.InputSchema,
  }));
}

export function createAnthropicProvider(): ChatProvider {
  let client: Anthropic | null = null;
  const getClient = () => (client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));

  return {
    name: "anthropic",

    isConfigured() {
      return !!process.env.ANTHROPIC_API_KEY;
    },

    async chatWithTools(messages, tools, opts?: ChatOptions): Promise<AssistantMessage> {
      const { system, converted } = toAnthropicMessages(messages);
      const response = await getClient().messages.create({
        model: model(opts?.model),
        max_tokens: opts?.maxTokens ?? 1024,
        ...(system ? { system } : {}),
        messages: converted,
        tools: toAnthropicTools(tools),
        ...(opts?.toolChoice === "required" ? { tool_choice: { type: "any" as const } } : {}),
      });

      const textParts: string[] = [];
      const toolCalls: ToolCall[] = [];
      for (const block of response.content) {
        if (block.type === "text") textParts.push(block.text);
        else if (block.type === "tool_use") {
          toolCalls.push({
            id: block.id,
            type: "function",
            function: { name: block.name, arguments: JSON.stringify(block.input ?? {}) },
          });
        }
      }
      return {
        role: "assistant",
        content: textParts.length > 0 ? textParts.join("") : null,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: { promptTokens: response.usage.input_tokens, completionTokens: response.usage.output_tokens },
      };
    },

    async chatText(messages, opts?: ChatOptions): Promise<string> {
      const { system, converted } = toAnthropicMessages(messages);
      const response = await getClient().messages.create({
        model: model(opts?.model),
        max_tokens: opts?.maxTokens ?? 1024,
        ...(system ? { system } : {}),
        messages: converted,
      });
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
    },

    async chatStream(messages, opts?: ChatOptions): Promise<ReadableStream<Uint8Array>> {
      const { system, converted } = toAnthropicMessages(messages);
      const stream = getClient().messages.stream({
        model: model(opts?.model),
        max_tokens: opts?.maxTokens ?? 1024,
        ...(system ? { system } : {}),
        messages: converted,
      });

      const encoder = new TextEncoder();
      return new ReadableStream<Uint8Array>({
        start(controller) {
          stream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
          stream.on("end", () => controller.close());
          stream.on("error", (err) => controller.error(err));
        },
        cancel() {
          stream.abort();
        },
      });
    },
  };
}
