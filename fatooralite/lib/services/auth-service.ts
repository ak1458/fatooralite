import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import type { RegisterInput } from "@/lib/validation/schemas";

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
    return await db.$transaction(async (tx) => {
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
        },
      });
      return { company, user };
    });
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
