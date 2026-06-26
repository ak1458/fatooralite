import { NextResponse } from "next/server";
import { computeInsights } from "@/lib/ai/insights";
import { chatText, isConfigured } from "@/lib/ai/openrouter";
import { requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const { deny } = await requirePermission(req, "audit:view", companyId);
  if (deny) return deny;

  try {
    const { insights, stats } = await computeInsights(companyId);

    // Optional AI layer: turn the hard numbers into one advisory sentence.
    // Grounded strictly in `stats` so it cannot invent figures.
    let summary: string | null = null;
    if (isConfigured()) {
      try {
        summary = await chatText(
          [
            {
              role: "system",
              content:
                "You are a ZATCA e-invoicing compliance assistant. Reply with ONE short, plain " +
                "advisory sentence (max 30 words) telling the owner what to prioritise. Use only the " +
                "numbers provided; never invent figures. No preamble, no markdown.",
            },
            { role: "user", content: JSON.stringify(stats) },
          ],
          256,
        );
        summary = summary || null;
      } catch (e) {
        console.error("Insight summary error:", e);
      }
    }

    return NextResponse.json({ insights, stats, summary });
  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json({ error: "Failed to compute insights" }, { status: 500 });
  }
}
