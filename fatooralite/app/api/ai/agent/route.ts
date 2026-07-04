import { NextResponse } from "next/server";
import { chatWithTools, isConfigured, type ChatMessage } from "@/lib/ai/provider";
import { toolSchemas, executeTool, confirmSummary } from "@/lib/ai/tools";
import { retrieve } from "@/lib/ai/vector-store";
import { ZATCA_SYSTEM_PROMPT } from "@/lib/ai/zatca-prompt";
import { requirePermission, getUserFromRequest, effectivePermissions } from "@/lib/auth/server";

export const runtime = "nodejs";
export const maxDuration = 120;

interface InboundMessage {
  role: "user" | "assistant" | "model";
  text?: string;
  content?: string;
}

const MAX_ROUNDS = 5;

/**
 * POST /api/ai/agent — the do-anything assistant. The model can call app tools
 * (create/read invoices, customers, products, reports, submit to ZATCA, navigate)
 * in a loop, and answers ZATCA questions grounded in retrieved knowledge. Every
 * tool is zod-validated and RBAC-gated server-side.
 */
export async function POST(req: Request) {
  const { deny } = await requirePermission(req, "audit:view");
  if (deny) return deny;

  const user = await getUserFromRequest(req);
  let body: {
    messages?: InboundMessage[];
    message?: string;
    companyId?: string;
    model?: string;
    /** Confirm round-trip: the user approved a pending write action. */
    confirmedAction?: { name: string; arguments: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const companyId = body.companyId ?? user?.companyId;
  if (!companyId) return NextResponse.json({ message: "No active company.", navigate: null });

  // Effective permission set (system role + custom DB role) for tool RBAC.
  const permissions = user ? await effectivePermissions(user) : undefined;

  // Confirmed action: execute directly (zod + RBAC still enforced inside).
  if (body.confirmedAction) {
    const { name, arguments: argsJson } = body.confirmedAction;
    if (typeof name !== "string" || typeof argsJson !== "string") {
      return NextResponse.json({ error: "Invalid confirmed action" }, { status: 400 });
    }
    const outcome = await executeTool(name, argsJson, {
      companyId,
      userRole: user?.role ?? "employee",
      permissions,
    });
    return NextResponse.json({ message: outcome.content, navigate: outcome.navigate ?? null });
  }

  const history = (body.messages ?? (body.message ? [{ role: "user" as const, text: body.message }] : []))
    .map((m) => ({
      role: (m.role === "model" ? "assistant" : m.role) as "user" | "assistant",
      content: (m.text ?? m.content ?? "").toString(),
    }))
    .filter((m) => m.content.trim().length > 0);
  if (history.length === 0) return NextResponse.json({ error: "message is required" }, { status: 400 });

  if (!isConfigured()) {
    return NextResponse.json({
      message: "I'm in mock mode — configure an AI provider key (e.g. OPENROUTER_API_KEY) to enable live actions.",
      navigate: null,
    });
  }

  // Ground ZATCA questions with retrieved knowledge.
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  let grounding = "";
  try {
    const hits = await retrieve(lastUser?.content ?? "", companyId, 4);
    if (hits.length > 0) {
      grounding = "\n\nZATCA knowledge you may use (cite as [n]):\n" + hits.map((h, i) => `[${i + 1}] ${h.text}`).join("\n");
    }
  } catch { /* continue without grounding */ }

  const system = {
    role: "system" as const,
    content:
      ZATCA_SYSTEM_PROMPT +
      "\n\nYou are an in-app assistant with TOOLS to read and change the user's data (invoices, " +
      "customers, products, reports, compliance, ZATCA submission, navigation).\n" +
      "RULES:\n" +
      "- If the user asks to CREATE, ADD, ISSUE, LIST, SHOW, FIND, SUBMIT, REPORT, or OPEN anything, you " +
      "MUST call the matching tool. Do not answer from memory and NEVER claim you did something unless a " +
      "tool call actually returned success.\n" +
      "- After a tool returns, confirm with the specifics it gave you (e.g. the created invoice number or the queried numbers).\n" +
      "- Only answer directly (no tool) for general ZATCA rule questions; ground those in the knowledge below and cite [n]." +
      grounding,
  };

  const ctx = { companyId, userRole: user?.role ?? "owner", permissions };
  const messages: ChatMessage[] = [system, ...history];
  let navigate: string | null = null;

  // Force a tool call on the first round when the message is clearly a command,
  // so free models don't reply "done" without actually acting.
  const isCommand = /^\s*(create|add|issue|make|generate|list|show|find|get|submit|report|open|go to|new|update|set|delete|remove)\b/i.test(
    lastUser?.content ?? "",
  );

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const toolChoice = round === 0 && isCommand ? "required" : "auto";
      const assistant = await chatWithTools(messages, toolSchemas(), body.model, 1024, toolChoice);

      if (assistant.tool_calls && assistant.tool_calls.length > 0) {
        // Financial/irreversible writes pause for explicit user confirmation:
        // return a pending action instead of executing anything this round.
        for (const call of assistant.tool_calls) {
          const summary = confirmSummary(call.function.name, call.function.arguments);
          if (summary) {
            return NextResponse.json({
              message:
                (assistant.content?.trim() ? assistant.content.trim() + "\n\n" : "") +
                "I need your confirmation before doing this.",
              navigate,
              pendingAction: {
                name: call.function.name,
                arguments: call.function.arguments,
                summary,
              },
            });
          }
        }

        messages.push({ role: "assistant", content: assistant.content ?? "", tool_calls: assistant.tool_calls });
        for (const call of assistant.tool_calls) {
          const outcome = await executeTool(call.function.name, call.function.arguments, ctx);
          if (outcome.navigate) navigate = outcome.navigate;
          messages.push({ role: "tool", tool_call_id: call.id, content: outcome.content });
        }
        continue;
      }

      return NextResponse.json({ message: assistant.content ?? "Done.", navigate });
    }
    // Hit the round cap — return whatever we have.
    return NextResponse.json({ message: "Done.", navigate });
  } catch (err) {
    console.error("Agent error:", err);
    return NextResponse.json({ message: "The assistant hit an error. Please try again.", navigate: null });
  }
}
