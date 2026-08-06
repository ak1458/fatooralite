import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { isRole } from "@/lib/auth/rbac";

export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

export interface InviteUserArgs {
  companyId: string;
  email: string;
  name: string;
  role: string;
  title?: string | null;
  password?: string;
}

/** Add a team member. With a password they're active immediately; without one
 *  they're "invited" (account created, login pending). Email must be unique. */
export async function inviteUser(args: InviteUserArgs, db: PrismaClient = defaultDb) {
  if (!isRole(args.role)) throw new UserError(`Unknown role: ${args.role}`);
  const existing = await db.user.findUnique({ where: { email: args.email } });
  if (existing) throw new UserError("A user with this email already exists");

  return db.user.create({
    data: {
      companyId: args.companyId,
      email: args.email,
      name: args.name,
      role: args.role,
      title: args.title ?? null,
      status: args.password ? "active" : "invited",
      passwordHash: args.password ? hashPassword(args.password) : null,
    },
  });
}

export interface UpdateUserArgs {
  role?: string;
  /** Custom DB role id; null clears it (back to the system role only). */
  roleId?: string | null;
  title?: string | null;
  status?: "active" | "invited" | "disabled";
}

export async function updateUser(id: string, args: UpdateUserArgs, db: PrismaClient = defaultDb) {
  if (args.role && !isRole(args.role)) throw new UserError(`Unknown role: ${args.role}`);

  // Assigning a custom role: it must exist in the same company as the user.
  if (args.roleId) {
    const [target, role] = await Promise.all([
      db.user.findUnique({ where: { id }, select: { companyId: true } }),
      db.role.findUnique({ where: { id: args.roleId }, select: { companyId: true } }),
    ]);
    if (!role || !target || role.companyId !== target.companyId) {
      throw new UserError("Unknown role for this company");
    }
  }

  return db.user.update({
    where: { id },
    data: {
      // Choosing a system role clears any custom role, and vice versa the
      // custom role keeps the existing system slug as its permission base.
      ...(args.role ? { role: args.role, roleId: null } : {}),
      ...(args.roleId !== undefined && !args.role ? { roleId: args.roleId } : {}),
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.status ? { status: args.status } : {}),
    },
  });
}

export async function removeUser(id: string, db: PrismaClient = defaultDb) {
  return db.user.delete({ where: { id } });
}
