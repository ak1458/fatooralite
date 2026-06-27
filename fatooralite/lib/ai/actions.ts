import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { can, type Permission } from "@/lib/auth/rbac";

export interface ActionContext {
  companyId: string;
  userRole: string;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  navigate?: string;
  data?: unknown;
}

interface ActionDef {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  permission: Permission;
  handler: (params: unknown, ctx: ActionContext) => Promise<ActionResult>;
}

/** Server-side registry of actions the assistant may perform. Each is validated
 *  with zod and gated by RBAC before its handler runs — no arbitrary execution. */
const ACTIONS: Record<string, ActionDef> = {
  generateReport: {
    name: "generateReport",
    description: "Open the VAT report for a date range. params: { rangeDays?: number }",
    schema: z.object({ rangeDays: z.number().int().positive().max(366).optional() }),
    permission: "audit:view",
    async handler(params, ctx) {
      const { rangeDays } = params as { rangeDays?: number };
      const days = rangeDays ?? 30;
      return {
        ok: true,
        message: `Opening your ${days}-day report.`,
        navigate: `/reports?rangeDays=${days}`,
      };
    },
  },
  addCustomer: {
    name: "addCustomer",
    description: "Create a customer. params: { name: string, vatNumber?: string, city?: string }",
    schema: z.object({
      name: z.string().min(1).max(100),
      vatNumber: z.string().length(15).regex(/^[0-9]+$/).optional(),
      city: z.string().max(100).optional(),
    }),
    permission: "invoice:create",
    async handler(params, ctx) {
      const p = params as { name: string; vatNumber?: string; city?: string };
      await prisma.customer.create({
        data: { companyId: ctx.companyId, name: p.name, vatNumber: p.vatNumber ?? null, city: p.city ?? null },
      });
      return { ok: true, message: `Added customer "${p.name}".`, navigate: "/customers" };
    },
  },
  addProduct: {
    name: "addProduct",
    description: "Create a product. params: { name: string, unitPrice: number, vatCategory?: 'S'|'Z'|'E'|'O' }",
    schema: z.object({
      name: z.string().min(1).max(100),
      unitPrice: z.number().min(0),
      vatCategory: z.enum(["S", "Z", "E", "O"]).optional(),
    }),
    permission: "invoice:create",
    async handler(params, ctx) {
      const p = params as { name: string; unitPrice: number; vatCategory?: "S" | "Z" | "E" | "O" };
      await prisma.product.create({
        data: { companyId: ctx.companyId, name: p.name, unitPrice: p.unitPrice, vatCategory: p.vatCategory ?? "S" },
      });
      return { ok: true, message: `Added product "${p.name}".`, navigate: "/products" };
    },
  },
  navigate: {
    name: "navigate",
    description: "Open a section of the app. params: { to: string } where to is a path like /invoices",
    schema: z.object({ to: z.string().regex(/^\/[a-z0-9/_-]*$/i) }),
    permission: "audit:view",
    async handler(params) {
      const { to } = params as { to: string };
      return { ok: true, message: `Opening ${to}.`, navigate: to };
    },
  },
};

export function listActions(): { name: string; description: string }[] {
  return Object.values(ACTIONS).map((a) => ({ name: a.name, description: a.description }));
}

/**
 * Extract a `{ action, params }` object from a model's reply (which may wrap the
 * JSON in prose or code fences). Returns null if nothing parseable is found.
 */
export function parseActionJson(text: string): { action: string; params: Record<string, unknown> } | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const obj = JSON.parse(candidate.slice(start, end + 1));
    if (obj && typeof obj.action === "string") {
      return { action: obj.action, params: obj.params ?? {} };
    }
  } catch {
    /* not JSON */
  }
  return null;
}

/** Validate + authorise + run a named action. */
export async function runAction(
  action: string,
  rawParams: unknown,
  ctx: ActionContext,
): Promise<ActionResult> {
  const def = ACTIONS[action];
  if (!def) return { ok: false, message: "I can't do that action." };
  if (!can(ctx.userRole, def.permission)) {
    return { ok: false, message: "You don't have permission to do that." };
  }
  const parsed = def.schema.safeParse(rawParams);
  if (!parsed.success) {
    return { ok: false, message: `Missing or invalid details: ${parsed.error.issues[0]?.message ?? "invalid input"}.` };
  }
  return def.handler(parsed.data, ctx);
}
