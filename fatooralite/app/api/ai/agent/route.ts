import { NextResponse } from "next/server";
import { chatText, isConfigured } from "@/lib/ai/openrouter";
import { listActions, parseActionJson, runAction } from "@/lib/ai/actions";
import { requirePermission, getUserFromRequest } from "@/lib/auth/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/ai/agent — turn a natural-language command into a validated, RBAC-gated
 * action. Returns { handled, message, navigate? }. If the message isn't a command,
 * returns { handled: false } so the client falls back to the RAG chat.
 */
export async function POST(req: Request) {
  const { deny } = await requirePermission(req, "audit:view");
  if (deny) return deny;

  const user = await getUserFromRequest(req);
  let body: { message?: string; companyId?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const message = (body.message ?? "").toString().trim();
  const companyId = body.companyId ?? user?.companyId;
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });
  if (!companyId) return NextResponse.json({ handled: false, message: "No active company." });

  // Without an AI key we can't route; let the client use chat.
  if (!isConfigured()) return NextResponse.json({ handled: false });

  const actionsList = listActions().map((a) => `- ${a.name}: ${a.description}`).join("\n");
  let routed: { action: string; params: Record<string, unknown> } | null = null;
  try {
    const reply = await chatText(
      [
        {
          role: "system",
          content:
            "You are an action router for a ZATCA e-invoicing app. If the user's message is a COMMAND " +
            "that maps to one of these actions, reply with ONLY a JSON object " +
            '{"action":"<name>","params":{...}}. If it is a question or no action fits, reply ' +
            '{"action":"none"}. No prose.\n\nActions:\n' + actionsList +
            '\n\nExamples:\n"make a 7 day report" => {"action":"generateReport","params":{"rangeDays":7}}\n' +
            '"add customer ACME vat 300000000000003" => {"action":"addCustomer","params":{"name":"ACME","vatNumber":"300000000000003"}}\n' +
            '"open invoices" => {"action":"navigate","params":{"to":"/invoices"}}',
        },
        { role: "user", content: message },
      ],
      256,
    );
    routed = parseActionJson(reply);
  } catch (e) {
    console.error("Agent routing error:", e);
    return NextResponse.json({ handled: false });
  }

  if (!routed || routed.action === "none") {
    return NextResponse.json({ handled: false });
  }

  const result = await runAction(routed.action, routed.params, {
    companyId,
    userRole: user?.role ?? "owner",
  });

  return NextResponse.json({ handled: result.ok, ...result });
}
