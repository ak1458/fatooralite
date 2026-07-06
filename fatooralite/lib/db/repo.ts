import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "./client";
import type { InvoiceInput } from "@/lib/zatca/types";
import { invoiceTotals, lineNet, lineVat, STANDARD_VAT_RATE } from "@/lib/zatca/money";
import { genesisHash } from "@/lib/zatca/hash";
import { decryptPrivateKey } from "@/lib/crypto/encrypt";

/**
 * Thin repository over Prisma. Every function takes an optional `db` so tests
 * can inject a throwaway client; app code uses the shared singleton.
 */

export async function createCompany(
  data: { name: string; nameAr?: string; vatNumber: string; crNumber?: string; address?: string },
  db: PrismaClient = defaultDb,
) {
  return db.company.create({ data });
}

export async function getCompany(id: string, db: PrismaClient = defaultDb) {
  return db.company.findUnique({ where: { id }, include: { branches: true, certificates: true } });
}

/** The company's active certificate (holds the signing key pair). */
export async function getActiveCertificate(companyId: string, db: PrismaClient = defaultDb) {
  const cert = await db.certificate.findFirst({
    where: { companyId, status: "active" },
    orderBy: { createdAt: "desc" },
  });
  if (cert && cert.privateKey) {
    cert.privateKey = decryptPrivateKey(cert.privateKey);
  }
  return cert;
}

export async function getInvoice(id: string, db: PrismaClient = defaultDb) {
  return db.invoice.findUnique({ where: { id }, include: { lines: true, records: true } });
}

/** Full audit view of one invoice: lines, gateway records, and stored artifacts. */
export async function getInvoiceAudit(id: string, db: PrismaClient = defaultDb) {
  return db.invoice.findUnique({
    where: { id },
    include: {
      lines: true,
      records: { orderBy: { createdAt: "desc" } },
      audit: { orderBy: { createdAt: "desc" } },
      company: { select: { name: true, nameAr: true, vatNumber: true } },
    },
  });
}

/** Search a company's invoices by number, UUID, or buyer name (audit vault). */
export async function searchInvoices(
  companyId: string,
  query: string,
  db: PrismaClient = defaultDb,
) {
  const q = query.trim();
  return db.invoice.findMany({
    where: {
      companyId,
      ...(q
        ? {
            OR: [
              { invoiceNumber: { contains: q } },
              { uuid: { contains: q } },
              { buyerName: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export interface CreateInvoiceArgs {
  companyId: string;
  branchId?: string;
  input: InvoiceInput;
}

/**
 * Persist a draft invoice plus its lines, computing money totals from the
 * engine so the DB and the signed XML always agree.
 */
export async function createInvoice(
  { companyId, branchId, input }: CreateInvoiceArgs,
  uuid: string,
  db: PrismaClient = defaultDb,
  extra?: { reportingDeadline?: Date | null },
) {
  const totals = invoiceTotals(input.lines);
  // Simplified (B2C) invoices enter the 24h reporting queue; standard invoices
  // are cleared synchronously and never reported on a timer.
  const reportingState = input.kind === "simplified" ? "pending" : "n/a";
  return db.invoice.create({
    data: {
      companyId,
      branchId,
      invoiceNumber: input.invoiceNumber,
      uuid,
      kind: input.kind,
      documentType: input.documentType ?? "invoice",
      status: "draft",
      issueDate: input.issueDate,
      issueTime: input.issueTime ?? "00:00:00",
      buyerName: input.buyer?.name,
      buyerVat: input.buyer?.vatNumber,
      taxableAmount: totals.taxableAmount,
      vatAmount: totals.vatAmount,
      grandTotal: totals.grandTotal,
      reportingState,
      reportingDeadline: extra?.reportingDeadline ?? null,
      lines: {
        create: input.lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          vatRate: l.vatRate ?? STANDARD_VAT_RATE,
          netAmount: lineNet(l),
          vatAmount: lineVat(l),
        })),
      },
    },
    include: { lines: true },
  });
}

export async function attachSignature(
  invoiceId: string,
  fields: { xml: string; hash: string; signature: string; qr: string; previousHash?: string },
  db: PrismaClient = defaultDb,
) {
  return db.invoice.update({
    where: { id: invoiceId },
    data: {
      xml: fields.xml,
      signedXml: fields.xml,
      hash: fields.hash,
      signature: fields.signature,
      qr: fields.qr,
      previousHash: fields.previousHash,
      status: "signed",
    },
  });
}

export async function setInvoiceStatus(
  invoiceId: string,
  status: string,
  resultCode: string | null = null,
  db: PrismaClient = defaultDb,
) {
  return db.invoice.update({
    where: { id: invoiceId },
    data: { status, resultCode },
  });
}

export async function listInvoices(
  companyId: string,
  filter?: { status?: string },
  db: PrismaClient = defaultDb,
) {
  return db.invoice.findMany({
    where: { companyId, ...(filter?.status ? { status: filter.status } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLastInvoiceHash(
  companyId: string,
  db: PrismaClient = defaultDb,
): Promise<string | null> {
  const last = await db.invoice.findFirst({
    where: { companyId, hash: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { hash: true },
  });
  return last?.hash ?? null;
}

export interface ChainSlot {
  /** ZATCA ICV — monotonic per EGS; also the sequential invoice number basis. */
  icv: number;
  /** Previous invoice hash (PIH) to chain this invoice to. */
  previousHash: string;
}

/**
 * Reserve the next slot in a company's invoice chain, holding a Postgres row
 * lock so concurrent serverless invocations queue instead of duplicating the
 * PIH / ICV.
 *
 * MUST be called inside an interactive transaction — pass the `tx` client. The
 * `FOR UPDATE` lock is held until that transaction commits, at which point the
 * next waiter proceeds with the committed `lastHash`.
 */
export async function nextChainSlot(
  companyId: string,
  tx: PrismaClient,
): Promise<ChainSlot> {
  // Lock the per-company counter row. Concurrent transactions block here.
  const locked = await tx.$queryRaw<{ next: number; lastHash: string | null }[]>`
    SELECT "next", "lastHash" FROM "InvoiceCounter"
    WHERE "companyId" = ${companyId}
    FOR UPDATE`;

  if (locked.length === 0) {
    // First invoice for this company: bootstrap the ledger row. The unique PK
    // means a concurrent duplicate INSERT is ignored, so exactly one wins; we
    // then re-lock so the rest of this transaction holds the row.
    const seed = await tx.invoice.count({ where: { companyId } });
    await tx.$executeRaw`
      INSERT INTO "InvoiceCounter" ("companyId", "next", "lastHash")
      VALUES (${companyId}, ${seed + 1}, NULL)
      ON CONFLICT ("companyId") DO NOTHING`;
    const row = await tx.$queryRaw<{ next: number; lastHash: string | null }[]>`
      SELECT "next", "lastHash" FROM "InvoiceCounter"
      WHERE "companyId" = ${companyId}
      FOR UPDATE`;
    return { icv: row[0].next, previousHash: row[0].lastHash ?? genesisHash() };
  }

  return { icv: locked[0].next, previousHash: locked[0].lastHash ?? genesisHash() };
}

/**
 * Advance the chain: bump the counter and commit this invoice's hash as the
 * next PIH. Call inside the SAME transaction as nextChainSlot, after the hash
 * is known, so the lock covers read → sign → write and the next issuer reads a
 * committed hash.
 */
export async function commitChainHash(
  companyId: string,
  icv: number,
  hash: string,
  tx: PrismaClient,
): Promise<void> {
  await tx.$executeRaw`
    UPDATE "InvoiceCounter"
    SET "next" = ${icv + 1}, "lastHash" = ${hash}
    WHERE "companyId" = ${companyId}`;
}

export async function addClearanceRecord(
  data: {
    invoiceId: string;
    action: string;
    status: string;
    responseCode?: string;
    message?: string;
    rawResponse?: string;
  },
  db: PrismaClient = defaultDb,
) {
  return db.clearanceRecord.create({ data });
}

export async function addAuditEntry(
  data: { invoiceId?: string; kind: string; payload: string },
  db: PrismaClient = defaultDb,
) {
  return db.auditEntry.create({ data });
}

export async function createUser(
  data: { companyId?: string; email: string; name: string; role: string; passwordHash: string },
  db: PrismaClient = defaultDb,
) {
  return db.user.create({ data });
}

export async function findUserByEmail(email: string, db: PrismaClient = defaultDb) {
  return db.user.findUnique({ where: { email } });
}

export async function searchAudit(
  query: { invoiceId?: string; kind?: string },
  db: PrismaClient = defaultDb,
) {
  return db.auditEntry.findMany({
    where: { ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}), ...(query.kind ? { kind: query.kind } : {}) },
    orderBy: { createdAt: "desc" },
  });
}
