import { randomBytes, createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";

/**
 * Server-minted, single-use confirmation for a sensitive AI-proposed write
 * (Phase 2 / W5 — closes F-10).
 *
 * The client-resent `{name, arguments}` pair was previously trusted as proof
 * that a human saw and approved what the model proposed — nothing bound it to
 * the actual proposal. Now the agent route mints a token when it returns a
 * pendingAction; the tool name and arguments it authorizes live in THIS
 * table, keyed by {userId, companyId, tool}. The client sends back only the
 * opaque token and its own copy of the arguments is never read again — so
 * nothing the client sends can alter what was actually approved.
 */

export const CONFIRMATION_TTL_MS = 5 * 60_000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface MintParams {
  userId: string;
  companyId: string;
  tool: string;
  argsJson: string;
}

/** Mint a token authorizing exactly this {user, company, tool, args}. Returns the raw token — stored only as its hash. */
export async function mintConfirmation(p: MintParams, db: PrismaClient = defaultDb): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS);

  await db.aiConfirmation.create({
    data: {
      tokenHash: hashToken(token),
      userId: p.userId,
      companyId: p.companyId,
      tool: p.tool,
      argsJson: p.argsJson,
      expiresAt,
    },
  });

  // Opportunistic cleanup — no cron needed for a table whose rows are all
  // dead within CONFIRMATION_TTL_MS of creation.
  db.aiConfirmation
    .deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 60 * 60_000) } } })
    .catch(() => {});

  return token;
}

export interface ConsumeParams {
  token: string;
  userId: string;
  companyId: string;
}

export interface ConsumedAction {
  tool: string;
  argsJson: string;
}

/**
 * Atomically consume a token: valid, unexpired, unused, and bound to the
 * presenting user+company, or null. The compare-and-swap on `consumedAt` is
 * what makes this single-use even under a doubled client request — two
 * concurrent consumes for the same token can both read the row, but only one
 * UPDATE ... WHERE consumedAt IS NULL matches.
 */
export async function consumeConfirmation(p: ConsumeParams, db: PrismaClient = defaultDb): Promise<ConsumedAction | null> {
  const tokenHash = hashToken(p.token);
  const now = new Date();

  const claim = await db.aiConfirmation.updateMany({
    where: { tokenHash, userId: p.userId, companyId: p.companyId, consumedAt: null, expiresAt: { gt: now } },
    data: { consumedAt: now },
  });
  if (claim.count === 0) return null;

  const row = await db.aiConfirmation.findUnique({ where: { tokenHash }, select: { tool: true, argsJson: true } });
  if (!row) return null; // defensive; the row we just claimed cannot vanish
  return { tool: row.tool, argsJson: row.argsJson };
}
