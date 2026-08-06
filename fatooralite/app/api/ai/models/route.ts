import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Selectable models for the assistant, for the active AI_PROVIDER only.
 *
 * This used to return OpenRouter model ids unconditionally. Once a second
 * OpenAI-compatible backend existed, that meant the picker offered ids the
 * configured provider rejects — the request fails at the provider, not here,
 * so the symptom is an assistant that silently stops answering.
 *
 * Every id listed must support tool calling: the assistant executes real
 * actions (lib/ai/tools.ts), and a model without tool support degrades to
 * plain chat with no visible error.
 */
const MODELS_BY_PROVIDER: Record<string, { id: string; label: string }[]> = {
  openrouter: [
    { id: "openai/gpt-oss-120b:free", label: "GPT-OSS 120B (free)" },
    { id: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B (free)" },
    { id: "nvidia/nemotron-nano-9b-v2:free", label: "Nemotron Nano 9B (free)" },
    { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super 120B (free)" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (fastest)" },
    { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
  ],
  // Anthropic and OpenAI are the enterprise paths: the deployment picks the
  // model via AI_MODEL and the picker stays out of the way rather than
  // offering a hardcoded list that goes stale as models are released.
  anthropic: [],
  openai: [],
};

const DEFAULT_MODEL_ENV: Record<string, string | undefined> = {
  openrouter: process.env.OPENROUTER_MODEL,
  groq: process.env.GROQ_MODEL,
  anthropic: process.env.ANTHROPIC_MODEL,
  openai: process.env.OPENAI_MODEL,
};

/** GET /api/ai/models — models selectable for the configured provider. */
export async function GET() {
  const provider = (process.env.AI_PROVIDER || "openrouter").toLowerCase();
  const models = MODELS_BY_PROVIDER[provider] ?? [];
  // An empty string lets the provider apply its own configured default rather
  // than pinning the request to a model this route guessed at.
  const defaultModel = process.env.AI_MODEL || DEFAULT_MODEL_ENV[provider] || models[0]?.id || "";
  return NextResponse.json({ provider, models, defaultModel });
}
