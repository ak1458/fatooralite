/**
 * Operator CLI over lib/flags/set-flag.ts (N6). This is the flag-management
 * surface — there is deliberately no platform-admin role or HTTP endpoint for
 * writing flags (see D7 in docs/audit/decision-register.md), so this runs
 * wherever an operator already has database access, same posture as
 * scripts/ingest-global.ts.
 *
 *   npx tsx scripts/set-flag.ts --list [--company <id|vatNumber>]
 *   npx tsx scripts/set-flag.ts --company <id|vatNumber> --flag <name> --on|--off|--clear --actor <email>
 */
import { PrismaClient } from "@prisma/client";
import { setFlag } from "../lib/flags/set-flag";
import { isFlagEnabled } from "../lib/flags/flags";
import { FLAG_NAMES, type FlagName } from "../lib/flags/registry";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(name);

async function resolveCompany(idOrVat: string) {
  return (
    (await prisma.company.findUnique({ where: { id: idOrVat } })) ??
    (await prisma.company.findUnique({ where: { vatNumber: idOrVat } }))
  );
}

async function list(companyArg: string | undefined) {
  const companies = companyArg
    ? [await resolveCompany(companyArg)].filter((c): c is NonNullable<typeof c> => c !== null)
    : await prisma.company.findMany({ orderBy: { name: "asc" } });

  if (companyArg && companies.length === 0) {
    console.error(`No company found matching "${companyArg}".`);
    process.exitCode = 1;
    return;
  }

  for (const company of companies) {
    const resolved = await Promise.all(FLAG_NAMES.map(async (f) => `${f}=${await isFlagEnabled(company.id, f, prisma)}`));
    console.log(`${company.name} (${company.id}): ${resolved.join(", ")}`);
  }
}

async function main() {
  if (has("--list")) {
    await list(arg("--company"));
    return;
  }

  const companyArg = arg("--company");
  const flagArg = arg("--flag");
  if (!companyArg || !flagArg) {
    console.error("Usage: npx tsx scripts/set-flag.ts --company <id|vatNumber> --flag <name> --on|--off|--clear --actor <email>");
    console.error(`Known flags: ${FLAG_NAMES.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  if (!(FLAG_NAMES as string[]).includes(flagArg)) {
    console.error(`Unknown flag "${flagArg}". Known flags: ${FLAG_NAMES.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const company = await resolveCompany(companyArg);
  if (!company) {
    console.error(`No company found matching "${companyArg}".`);
    process.exitCode = 1;
    return;
  }

  const enabled = has("--on") ? true : has("--off") ? false : has("--clear") ? null : undefined;
  if (enabled === undefined) {
    console.error("Specify exactly one of --on, --off, --clear.");
    process.exitCode = 1;
    return;
  }

  const actorEmail = arg("--actor");
  if (!actorEmail) {
    console.error("--actor <email> is required — every flag change is audited (A-221) and needs an attributable operator.");
    process.exitCode = 1;
    return;
  }

  await setFlag({ companyId: company.id, flag: flagArg as FlagName, enabled, actor: { email: actorEmail } }, prisma);
  console.log(`${company.name}: ${flagArg} = ${enabled === null ? "(cleared, falls back to default)" : enabled}`);
}

main()
  .catch((err) => {
    console.error("set-flag failed:", err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
