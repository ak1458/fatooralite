import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { startTrial } from "@/lib/billing/plan";
import type { RegisterInput } from "@/lib/validation/schemas";
import { recordSecurityEvent, SECURITY_EVENTS } from "@/lib/audit/events";

export class RegisterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegisterError";
  }
}

/**
 * Self-serve registration: create a tenant (Company, onboarding pending) and its
 * owner User in one transaction. Email and VAT number must be unique; the unique
 * constraints are the real guard, the pre-checks just give friendly messages.
 */
export async function registerCompany(input: RegisterInput, db: PrismaClient = defaultDb) {
  const existingUser = await db.user.findUnique({ where: { email: input.email } });
  if (existingUser) throw new RegisterError("An account with this email already exists");

  const existingCompany = await db.company.findUnique({ where: { vatNumber: input.vatNumber } });
  if (existingCompany) throw new RegisterError("A company with this VAT number already exists");

  try {
    const created = await db.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: input.companyName,
          vatNumber: input.vatNumber,
          onboardingStatus: "pending",
          onboardingStep: 0,
        },
      });
      const user = await tx.user.create({
        data: {
          companyId: company.id,
          email: input.email,
          name: input.name,
          role: "owner",
          passwordHash: hashPassword(input.password),
          acceptedTermsAt: new Date(),
        },
      });
      // Paid-only product: registration grants the 7-day trial explicitly.
      // Inside the transaction so a company can never exist without a
      // subscription row — lib/billing/entitlements.ts resolves a missing row
      // to "expired", which for a brand-new tenant would mean signing up and
      // immediately being unable to do anything.
      await startTrial(company.id, tx);
      return { company, user };
    });

    // Outside the transaction on purpose: recording must never be able to roll
    // back a completed registration.
    await recordSecurityEvent(
      {
        action: SECURITY_EVENTS.trialStarted,
        outcome: "success",
        companyId: created.company.id,
        actorId: created.user.id,
        actorEmail: created.user.email,
        targetType: "subscription",
        targetId: created.company.id,
        metadata: { plan: "trial" },
      },
      db,
    );
    return created;
  } catch (err) {
    // Lost a race on a unique constraint (email or vatNumber).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = String(err.meta?.target ?? "");
      throw new RegisterError(
        target.includes("vat")
          ? "A company with this VAT number already exists"
          : "An account with this email already exists",
      );
    }
    throw err;
  }
}
