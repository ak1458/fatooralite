import { NextResponse } from "next/server";
import { ZATCA_SYSTEM_PROMPT } from "@/lib/ai/zatca-prompt";
import { chatStream, isConfigured, type ChatMessage } from "@/lib/ai/openrouter";
import { retrieve } from "@/lib/ai/vector-store";
import { requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";
export const maxDuration = 120;

interface InboundMessage {
  role: "user" | "assistant" | "model";
  text?: string;
  content?: string;
}

const STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
};

/** Wrap a plain string in a one-shot, word-by-word text stream (mock path). */
function textStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const words = text.split(/(\s+)/);
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= words.length) return controller.close();
      controller.enqueue(encoder.encode(words[i++]));
    },
  });
}

export async function POST(req: Request) {
  // Any authenticated user may use the assistant; "audit:view" is the lowest gate.
  const { deny } = await requirePermission(req, "audit:view");
  if (deny) return deny;

  let body: { messages?: InboundMessage[]; context?: unknown; companyId?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages, context, companyId, model } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Missing messages array" }, { status: 400 });
  }

  const contextPrompt = context
    ? `\n\nThe user is currently viewing this invoice data. Use it to ground your answer:\n${JSON.stringify(context, null, 2)}`
    : "";

  // RAG: retrieve relevant ZATCA knowledge for the latest user message.
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query = (lastUser?.text ?? lastUser?.content ?? "").toString();
  let grounding = "";
  if (query) {
    try {
      const hits = await retrieve(query, companyId ?? null, 5);
      if (hits.length > 0) {
        grounding =
          "\n\nUse ONLY the following retrieved ZATCA knowledge to answer; cite sources as [n]. " +
          "If the answer is not covered, say so.\n" +
          hits.map((h, i) => `[${i + 1}] ${h.text}`).join("\n");
      }
    } catch (e) {
      console.error("RAG retrieve failed (continuing without grounding):", e);
    }
  }

  // Mock mode: no API key configured. Stream a canned answer so the UI works.
  if (!isConfigured()) {
    const mock =
      "I am Fatoora AI, running in **mock mode** — no `OPENROUTER_API_KEY` is configured. " +
      "Add it to your `.env` to enable live answers.\n\n" +
      "Quick reminder: standard (B2B) invoices must be **cleared** by ZATCA before you share them, " +
      "while simplified (B2C) invoices must be **reported within 24 hours** of issuance.";
    return new Response(textStream(mock), { headers: STREAM_HEADERS });
  }

  // Build the conversation: system prompt + full history (assistant -> assistant).
  const history: ChatMessage[] = messages
    .map((m) => ({
      role: (m.role === "model" ? "assistant" : m.role) as ChatMessage["role"],
      content: (m.text ?? m.content ?? "").toString(),
    }))
    .filter((m) => m.content.trim().length > 0);

  if (history.length === 0) {
    return NextResponse.json({ error: "No message content" }, { status: 400 });
  }

  const chat: ChatMessage[] = [
    { role: "system", content: ZATCA_SYSTEM_PROMPT + grounding + contextPrompt },
    ...history,
  ];

  try {
    const stream = await chatStream(chat, 1024, model);
    return new Response(stream, { headers: STREAM_HEADERS });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: "Failed to process AI request" }, { status: 500 });
  }
}
