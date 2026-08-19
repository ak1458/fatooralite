import { PrismaClient, type Prisma } from "@prisma/client";

/**
 * D6 (docs/audit/decision-register.md) — Option C: Postgres row-level
 * security as defence in depth beneath the application's own companyId
 * scoping, on the four highest-value tenant-scoped tables (see the
 * migration at prisma/migrations/20260819100000_row_level_security).
 *
 * This is a DELIBERATELY OPT-IN, EXPLICIT API — `queryAsTenant(companyId, fn)`
 * — not a transparent wrapper spliced into the app's main `prisma` client
 * (lib/db/client.ts). Two reasons, both load-bearing:
 *
 * 1. That client's connection also runs `issueInvoice()`'s own interactive
 *    transaction (lib/services/invoice-service.ts), which holds a row lock
 *    across read -> sign -> write for the PIH/ICV chain — the single most
 *    sensitive invariant in this app. Nesting a second transaction inside
 *    every operation of an already-open interactive transaction is not a
 *    supported Prisma pattern, and risking that chain to retrofit RLS
 *    transparently was judged not worth it this session.
 * 2. `SET LOCAL ROLE fatoora_rls_app` only takes effect for the lifetime of
 *    one transaction on one connection. An implicit, blanket wrapper around
 *    every query app-wide is exactly the "changes every query path, real
 *    regression risk" the decision register flagged — an explicit call site
 *    is auditable and reviewable one function at a time instead.
 *
 * What IS wired to this today: nothing in the main app yet — this session
 * delivers the mechanism, proven correct by lib/db/rls.test.ts's adversarial
 * cross-tenant test (a raw, unfiltered `findMany()` run through this client
 * cannot see another tenant's rows even though the query itself has no
 * `where` clause at all). Adopting it at specific read call sites is the
 * natural next increment, deliberately not done in the same session that
 * built and tested the primitive — see docs/audit/decision-register.md D6
 * for the honest PARTIAL/DONE split.
 *
 * `current_setting('app.company_id', true)` returns NULL, not an error,
 * when unset, so a connection that never calls this (the entire rest of the
 * app, unchanged) is unaffected — RLS only applies to the `fatoora_rls_app`
 * role, which nothing else ever assumes.
 */

const globalForRls = globalThis as unknown as { rlsPrisma?: PrismaClient };
const rlsClient = globalForRls.rlsPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForRls.rlsPrisma = rlsClient;

/**
 * Run `fn` against a transaction scoped to `companyId` via Postgres RLS —
 * `SET LOCAL ROLE fatoora_rls_app` (a non-owner role RLS actually applies
 * to) plus the `app.company_id` session GUC the policies check, both
 * transaction-local so this is safe under pgbouncer transaction pooling
 * (see docs/19-operations-runbook.md's pooled-vs-direct note for why
 * session-level `SET` is NOT safe there, and why `SET LOCAL` bound to one
 * transaction is).
 */
export async function queryAsTenant<T>(
  companyId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  client: PrismaClient = rlsClient,
): Promise<T> {
  return client.$transaction(async (tx) => {
    // Role names can't be bind parameters in SET ROLE — fatoora_rls_app is
    // a fixed constant in this file, never attacker-controlled.
    await tx.$executeRawUnsafe(`SET LOCAL ROLE fatoora_rls_app`);
    // set_config (unlike SET LOCAL app.company_id = ...) accepts a real bind
    // parameter, so companyId is never string-interpolated into SQL.
    await tx.$executeRaw`SELECT set_config('app.company_id', ${companyId}, true)`;
    return fn(tx);
  });
}
