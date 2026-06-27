import { PrismaClient } from "@prisma/client";
import { validateEnv } from "@/lib/env";

// Validate environment variables at boot — fail fast on misconfig.
validateEnv();

// Reuse a single PrismaClient across hot-reloads in dev (avoids exhausting
// connections). In production a single instance is created per process.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
