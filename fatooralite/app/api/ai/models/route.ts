import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** GET /api/ai/models — selectable free models for the assistant. */
export async function GET() {
  const defaultModel = process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free";
  const models = [
    { id: "openai/gpt-oss-120b:free", label: "GPT-OSS 120B (free)" },
    { id: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B (free)" },
    { id: "nvidia/nemotron-nano-9b-v2:free", label: "Nemotron Nano 9B (free)" },
    { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super 120B (free)" },
  ];
  return NextResponse.json({ models, defaultModel });
}
