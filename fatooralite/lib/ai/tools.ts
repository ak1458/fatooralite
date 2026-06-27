import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { can, type Permission } from "@/lib/auth/rbac";
import { issueInvoice } from "@/lib/services/invoice-service";
import { submitInvoice } from "@/lib/services/clearance-service";
import { computeClearanceStats } from "@/lib/services/clearance-stats";
import type { InvoiceInput } from "@/lib/zatca/types";

export interface ToolContext {
  companyId: string;
  userRole: string;
}

export interface ToolOutcome {
  /** Text fed back to the model (confirmation or queried data). */
  content: string;
  /** Optional client-side navigation to apply after the turn. */
  navigate?: string;
}

interface ToolDef {
  description: string;
  parameters: Record<string, unknown>; // JSON schema for the model
  schema: z.ZodTypeAny; // server-side validation
  permission: Permission;
  handler: (args: unknown, ctx: ToolContext) => Promise<ToolOutcome>;
}

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
});

function todayParts() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`,
  };
}

const TOOLS: Record<string, ToolDef> = {
  // ---- Reads ---------------------------------------------------------------
  listInvoices: {
    description: "List the company's recent invoices, optionally filtered by status (draft, signed, cleared, reported, rejected).",
    parameters: { type: "object", properties: { status: { type: "string" }, limit: { type: "number" } } },
    schema: z.object({ status: z.string().optional(), limit: z.number().int().positive().max(50).optional() }),
    permission: "audit:view",
    async handler(args, ctx) {
      const a = args as { status?: string; limit?: number };
      const invoices = await prisma.invoice.findMany({
        where: { companyId: ctx.companyId, ...(a.status ? { status: a.status } : {}) },
        orderBy: { createdAt: "desc" },
        take: a.limit ?? 10,
        select: { invoiceNumber: true, kind: true, status: true, grandTotal: true, buyerName: true, issueDate: true },
      });
      return { content: JSON.stringify(invoices) };
    },
  },
  listCustomers: {
    description: "List the company's customers.",
    parameters: { type: "object", properties: {} },
    schema: z.object({}),
    permission: "audit:view",
    async handler(_args, ctx) {
      const customers = await prisma.customer.findMany({
        where: { companyId: ctx.companyId }, orderBy: { createdAt: "desc" }, take: 50,
        select: { name: true, vatNumber: true, city: true, email: true },
      });
      return { content: JSON.stringify(customers) };
    },
  },
  listProducts: {
    description: "List the company's products.",
    parameters: { type: "object", properties: {} },
    schema: z.object({}),
    permission: "audit:view",
    async handler(_args, ctx) {
      const products = await prisma.product.findMany({
        where: { companyId: ctx.companyId }, orderBy: { createdAt: "desc" }, take: 50,
        select: { name: true, sku: true, unitPrice: true, vatCategory: true },
      });
      return { content: JSON.stringify(products) };
    },
  },
  getComplianceStats: {
    description: "Get compliance numbers: totals, cleared/reported/pending/rejected counts, success rate, VAT collected, and invoices near the 24h reporting deadline.",
    parameters: { type: "object", properties: {} },
    schema: z.object({}),
    permission: "audit:view",
    async handler(_args, ctx) {
      const invoices = await prisma.invoice.findMany({
        where: { companyId: ctx.companyId },
        select: { kind: true, status: true, vatAmount: true, issueDate: true, issueTime: true, resultCode: true },
      });
      return { content: JSON.stringify(computeClearanceStats(invoices)) };
    },
  },
  findInvoice: {
    description: "Find one invoice by its invoice number and return its details.",
    parameters: { type: "object", properties: { invoiceNumber: { type: "string" } }, required: ["invoiceNumber"] },
    schema: z.object({ invoiceNumber: z.string().min(1) }),
    permission: "audit:view",
    async handler(args, ctx) {
      const a = args as { invoiceNumber: string };
      const inv = await prisma.invoice.findFirst({
        where: { companyId: ctx.companyId, invoiceNumber: a.invoiceNumber },
        select: { invoiceNumber: true, kind: true, status: true, grandTotal: true, vatAmount: true, buyerName: true, resultCode: true, issueDate: true },
      });
      return { content: inv ? JSON.stringify(inv) : `No invoice found with number ${a.invoiceNumber}.` };
    },
  },
  getReport: {
    description: "Open a VAT report for the last N days (default 30) and return its totals.",
    parameters: { type: "object", properties: { rangeDays: { type: "number" } } },
    schema: z.object({ rangeDays: z.number().int().positive().max(366).optional() }),
    permission: "audit:view",
    async handler(args, ctx) {
      const a = args as { rangeDays?: number };
      const days = a.rangeDays ?? 30;
      const start = new Date(Date.now() - days * 86_400_000);
      const invoices = await prisma.invoice.findMany({
        where: { companyId: ctx.companyId, status: { in: ["cleared", "reported"] }, createdAt: { gte: start } },
        select: { taxableAmount: true, vatAmount: true },
      });
      const totalTaxable = invoices.reduce((s, i) => s + i.taxableAmount, 0);
      const totalVat = invoices.reduce((s, i) => s + i.vatAmount, 0);
      return {
        content: JSON.stringify({ period: `Last ${days} days`, totalInvoices: invoices.length, totalTaxable, totalVat }),
        navigate: `/reports?rangeDays=${days}`,
      };
    },
  },

  // ---- Writes --------------------------------------------------------------
  addCustomer: {
    description: "Create a customer.",
    parameters: {
      type: "object",
      properties: { name: { type: "string" }, vatNumber: { type: "string" }, city: { type: "string" }, email: { type: "string" } },
      required: ["name"],
    },
    schema: z.object({
      name: z.string().min(1).max(100),
      vatNumber: z.string().length(15).regex(/^[0-9]+$/).optional(),
      city: z.string().max(100).optional(),
      email: z.string().email().max(200).optional(),
    }),
    permission: "invoice:create",
    async handler(args, ctx) {
      const a = args as { name: string; vatNumber?: string; city?: string; email?: string };
      await prisma.customer.create({ data: { companyId: ctx.companyId, name: a.name, vatNumber: a.vatNumber ?? null, city: a.city ?? null, email: a.email ?? null } });
      return { content: `Created customer "${a.name}".`, navigate: "/customers" };
    },
  },
  addProduct: {
    description: "Create a product.",
    parameters: {
      type: "object",
      properties: { name: { type: "string" }, unitPrice: { type: "number" }, vatCategory: { type: "string", enum: ["S", "Z", "E", "O"] }, sku: { type: "string" } },
      required: ["name", "unitPrice"],
    },
    schema: z.object({
      name: z.string().min(1).max(100),
      unitPrice: z.number().min(0),
      vatCategory: z.enum(["S", "Z", "E", "O"]).optional(),
      sku: z.string().max(50).optional(),
    }),
    permission: "invoice:create",
    async handler(args, ctx) {
      const a = args as { name: string; unitPrice: number; vatCategory?: "S" | "Z" | "E" | "O"; sku?: string };
      await prisma.product.create({ data: { companyId: ctx.companyId, name: a.name, unitPrice: a.unitPrice, vatCategory: a.vatCategory ?? "S", sku: a.sku ?? null } });
      return { content: `Created product "${a.name}".`, navigate: "/products" };
    },
  },
  createInvoice: {
    description: "Create and sign an invoice. kind is 'standard' (B2B, needs buyer) or 'simplified' (B2C). lines is an array of { description, quantity, unitPrice }.",
    parameters: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["standard", "simplified"] },
        buyerName: { type: "string" },
        buyerVat: { type: "string" },
        lines: { type: "array", items: { type: "object", properties: { description: { type: "string" }, quantity: { type: "number" }, unitPrice: { type: "number" } }, required: ["description", "quantity", "unitPrice"] } },
      },
      required: ["kind", "lines"],
    },
    schema: z.object({
      kind: z.enum(["standard", "simplified"]),
      buyerName: z.string().max(100).optional(),
      buyerVat: z.string().length(15).regex(/^[0-9]+$/).optional(),
      lines: z.array(lineSchema).min(1),
    }),
    permission: "invoice:create",
    async handler(args, ctx) {
      const a = args as { kind: "standard" | "simplified"; buyerName?: string; buyerVat?: string; lines: z.infer<typeof lineSchema>[] };
      const company = await prisma.company.findUnique({ where: { id: ctx.companyId } });
      if (!company) return { content: "Company not found." };
      if (a.kind === "standard" && !a.buyerName) return { content: "A standard invoice needs a buyer name. Ask the user for the buyer." };
      const { date, time } = todayParts();
      const input: InvoiceInput = {
        invoiceNumber: `INV-${date.slice(0, 4)}-${Math.floor(10000 + Math.random() * 89999)}`,
        kind: a.kind,
        issueDate: date,
        issueTime: time,
        seller: { name: company.name, vatNumber: company.vatNumber },
        buyer: a.buyerName ? { name: a.buyerName, vatNumber: a.buyerVat } : undefined,
        lines: a.lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice })),
      };
      try {
        const result = await issueInvoice(ctx.companyId, input);
        return { content: `Issued & signed invoice ${input.invoiceNumber} (total SAR ${result.signed.totals.grandTotal.toFixed(2)}).`, navigate: "/invoices" };
      } catch (e) {
        return { content: `Could not issue invoice: ${e instanceof Error ? e.message : "error"}. The company may need a signing certificate (complete onboarding).` };
      }
    },
  },
  submitInvoice: {
    description: "Submit a signed invoice to ZATCA (clearance for standard, reporting for simplified) by its invoice number.",
    parameters: { type: "object", properties: { invoiceNumber: { type: "string" } }, required: ["invoiceNumber"] },
    schema: z.object({ invoiceNumber: z.string().min(1) }),
    permission: "invoice:clear",
    async handler(args, ctx) {
      const a = args as { invoiceNumber: string };
      const inv = await prisma.invoice.findFirst({ where: { companyId: ctx.companyId, invoiceNumber: a.invoiceNumber } });
      if (!inv) return { content: `No invoice ${a.invoiceNumber} found.` };
      try {
        const res = await submitInvoice(inv.id);
        return { content: `Submitted ${a.invoiceNumber} to ZATCA: ${res.status}.`, navigate: "/clearance" };
      } catch (e) {
        return { content: `Submission failed: ${e instanceof Error ? e.message : "error"}. Connect real ZATCA (Integration) to clear/report.` };
      }
    },
  },
  navigate: {
    description: "Open a section of the app by path, e.g. /invoices, /customers, /reports, /clearance, /settings.",
    parameters: { type: "object", properties: { to: { type: "string" } }, required: ["to"] },
    schema: z.object({ to: z.string().regex(/^\/[a-z0-9/_-]*$/i) }),
    permission: "audit:view",
    async handler(args) {
      const a = args as { to: string };
      return { content: `Opening ${a.to}.`, navigate: a.to };
    },
  },
};

/** OpenAI-style tool schemas to send to the model. */
export function toolSchemas() {
  return Object.entries(TOOLS).map(([name, t]) => ({
    type: "function" as const,
    function: { name, description: t.description, parameters: t.parameters },
  }));
}

/** Validate + authorise + run a tool the model asked for. */
export async function executeTool(name: string, argsJson: string, ctx: ToolContext): Promise<ToolOutcome> {
  const def = TOOLS[name];
  if (!def) return { content: `Unknown tool: ${name}.` };
  if (!can(ctx.userRole, def.permission)) return { content: "You don't have permission to do that." };

  let parsedArgs: unknown;
  try {
    parsedArgs = argsJson ? JSON.parse(argsJson) : {};
  } catch {
    return { content: "Invalid tool arguments." };
  }
  const valid = def.schema.safeParse(parsedArgs);
  if (!valid.success) return { content: `Invalid arguments: ${valid.error.issues[0]?.message ?? "invalid"}.` };

  try {
    return await def.handler(valid.data, ctx);
  } catch (e) {
    return { content: `Tool error: ${e instanceof Error ? e.message : "failed"}.` };
  }
}
