import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import { createCustomerSchema, createProductSchema } from "@/lib/validation/schemas";
import { parseCsv, type CsvDataRow } from "./csv";

export const MAX_CSV_BYTES = 1_000_000;
export const MAX_IMPORT_ROWS = 500;

export type RowVerdict = "create" | "skip-duplicate" | "error";

export interface RowResult {
  row: number;
  verdict: RowVerdict;
  /** Field-level messages for "error"; a short note for "skip-duplicate". */
  message?: string;
  /** The parsed, validated data — present only for "create". */
  data?: Record<string, unknown>;
}

export interface ImportPreview {
  entity: "customers" | "products";
  headers: string[];
  results: RowResult[];
  summary: { create: number; skipDuplicate: number; error: number };
}

interface EntityDescriptor {
  name: "customers" | "products";
  /** Exact expected header row, in order — this cut uses fixed headers, not a mapping UI. */
  headers: string[];
  schema: { safeParse: (v: unknown) => { success: boolean; data?: Record<string, unknown>; error?: { issues: { path: PropertyKey[]; message: string }[] } } };
  /** Cell → raw object (still needs schema validation after this). */
  toRaw: (cells: string[]) => Record<string, unknown>;
  /** Duplicate identity: null means "no identity available, never treated as a duplicate". */
  duplicateKey: (data: Record<string, unknown>) => string | null;
  existingKeys: (companyId: string, db: PrismaClient) => Promise<Set<string>>;
  createMany: (companyId: string, rows: Record<string, unknown>[], db: PrismaClient) => Promise<void>;
}

function cell(cells: string[], headers: string[], name: string): string {
  const i = headers.indexOf(name);
  return i >= 0 ? (cells[i] ?? "").trim() : "";
}

const CUSTOMER_HEADERS = ["name", "nameAr", "vatNumber", "crNumber", "address", "city", "phone", "email"];
const PRODUCT_HEADERS = ["name", "sku", "unitPrice", "vatCategory"];

const customerEntity: EntityDescriptor = {
  name: "customers",
  headers: CUSTOMER_HEADERS,
  schema: createCustomerSchema,
  toRaw: (cells) => ({
    name: cell(cells, CUSTOMER_HEADERS, "name"),
    nameAr: cell(cells, CUSTOMER_HEADERS, "nameAr") || null,
    vatNumber: cell(cells, CUSTOMER_HEADERS, "vatNumber") || null,
    crNumber: cell(cells, CUSTOMER_HEADERS, "crNumber") || null,
    address: cell(cells, CUSTOMER_HEADERS, "address") || null,
    city: cell(cells, CUSTOMER_HEADERS, "city") || null,
    phone: cell(cells, CUSTOMER_HEADERS, "phone") || null,
    email: cell(cells, CUSTOMER_HEADERS, "email") || null,
  }),
  duplicateKey: (data) => (data.vatNumber as string | null) || (data.name as string) || null,
  existingKeys: async (companyId, db) => {
    const rows = await db.customer.findMany({ where: { companyId }, select: { vatNumber: true, name: true } });
    return new Set(rows.map((r) => r.vatNumber || r.name));
  },
  createMany: async (companyId, rows, db) => {
    await db.customer.createMany({ data: rows.map((r) => ({ companyId, ...r })) as never });
  },
};

const productEntity: EntityDescriptor = {
  name: "products",
  headers: PRODUCT_HEADERS,
  schema: createProductSchema,
  toRaw: (cells) => {
    const unitPriceRaw = cell(cells, PRODUCT_HEADERS, "unitPrice");
    return {
      name: cell(cells, PRODUCT_HEADERS, "name"),
      sku: cell(cells, PRODUCT_HEADERS, "sku") || null,
      // Intentionally left as NaN on a non-numeric cell rather than defaulted
      // to 0 — the schema's z.number() rejects NaN, which is what turns a
      // garbled price into a per-row error instead of a silent zero.
      unitPrice: unitPriceRaw === "" ? NaN : Number(unitPriceRaw),
      vatCategory: cell(cells, PRODUCT_HEADERS, "vatCategory") || "S",
    };
  },
  duplicateKey: (data) => (data.sku as string | null) || (data.name as string) || null,
  existingKeys: async (companyId, db) => {
    const rows = await db.product.findMany({ where: { companyId }, select: { sku: true, name: true } });
    return new Set(rows.map((r) => r.sku || r.name));
  },
  createMany: async (companyId, rows, db) => {
    await db.product.createMany({ data: rows.map((r) => ({ companyId, ...r })) as never });
  },
};

const ENTITIES: Record<"customers" | "products", EntityDescriptor> = {
  customers: customerEntity,
  products: productEntity,
};

export class ImportTooLargeError extends Error {}
export class ImportHeaderMismatchError extends Error {
  constructor(public readonly expected: string[], public readonly found: string[]) {
    super(`Header row must be exactly: ${expected.join(",")} (found: ${found.join(",") || "<empty>"})`);
  }
}

function evaluateRows(entity: EntityDescriptor, dataRows: CsvDataRow[], existingKeys: Set<string>): RowResult[] {
  const seenThisFile = new Set<string>();
  const results: RowResult[] = [];
  for (const { row, cells } of dataRows) {
    const raw = entity.toRaw(cells);
    const parsed = entity.schema.safeParse(raw);
    if (!parsed.success) {
      const message = (parsed.error?.issues ?? []).map((i) => `${i.path.join(".") || "value"}: ${i.message}`).join("; ") || "Invalid row";
      results.push({ row, verdict: "error", message });
      continue;
    }
    const data = parsed.data!;
    const key = entity.duplicateKey(data);
    if (key && (existingKeys.has(key) || seenThisFile.has(key))) {
      results.push({ row, verdict: "skip-duplicate", message: `Matches an existing or already-listed ${entity.name.slice(0, -1)} (${key})` });
      continue;
    }
    if (key) seenThisFile.add(key);
    results.push({ row, verdict: "create", data });
  }
  return results;
}

function summarize(results: RowResult[]): ImportPreview["summary"] {
  return {
    create: results.filter((r) => r.verdict === "create").length,
    skipDuplicate: results.filter((r) => r.verdict === "skip-duplicate").length,
    error: results.filter((r) => r.verdict === "error").length,
  };
}

function parseAndValidateHeader(entityName: "customers" | "products", csv: string) {
  if (Buffer.byteLength(csv, "utf8") > MAX_CSV_BYTES) {
    throw new ImportTooLargeError(`File exceeds the ${MAX_CSV_BYTES.toLocaleString()}-byte limit`);
  }
  const entity = ENTITIES[entityName];
  const parsed = parseCsv(csv);
  if (parsed.headers.join(",") !== entity.headers.join(",")) {
    throw new ImportHeaderMismatchError(entity.headers, parsed.headers);
  }
  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    throw new ImportTooLargeError(`File has ${parsed.rows.length} data rows, exceeding the ${MAX_IMPORT_ROWS}-row limit`);
  }
  return { entity, parsed };
}

/** Parse + validate + evaluate every row, without writing anything. */
export async function previewImport(companyId: string, entityName: "customers" | "products", csv: string, db: PrismaClient = defaultDb): Promise<ImportPreview> {
  const { entity, parsed } = parseAndValidateHeader(entityName, csv);
  const existingKeys = await entity.existingKeys(companyId, db);
  const rowResults = evaluateRows(entity, parsed.rows, existingKeys);
  const structuralErrors: RowResult[] = parsed.errors.map((e) => ({ row: e.row, verdict: "error" as const, message: e.message }));
  const results = [...structuralErrors, ...rowResults].sort((a, b) => a.row - b.row);
  return { entity: entityName, headers: entity.headers, results, summary: summarize(results) };
}

export class ImportHasErrorsError extends Error {
  constructor(public readonly preview: ImportPreview) {
    super(`Refusing to commit: ${preview.summary.error} row(s) failed validation`);
  }
}

/**
 * Re-parses and re-evaluates (never trusts a client-cached preview), then —
 * only if every row is `create` or `skip-duplicate` — inserts every `create`
 * row in one transaction via `createMany`. Any `error` row refuses the
 * entire commit: partial-failure handling and rollback are both satisfied by
 * construction (nothing can be half-inserted), not by cleanup code.
 */
export async function commitImport(companyId: string, entityName: "customers" | "products", csv: string, db: PrismaClient = defaultDb): Promise<ImportPreview> {
  const preview = await previewImport(companyId, entityName, csv, db);
  if (preview.summary.error > 0) throw new ImportHasErrorsError(preview);

  const toCreate = preview.results.filter((r) => r.verdict === "create").map((r) => r.data!);
  if (toCreate.length > 0) {
    await ENTITIES[entityName].createMany(companyId, toCreate, db);
  }
  return preview;
}
