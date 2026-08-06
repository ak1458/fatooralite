import type { Prisma } from "@prisma/client";

/**
 * Money columns are stored as Decimal(14,2) (exact) but the app works in plain
 * numbers. Convert at the read boundary — never let a Prisma Decimal leak into
 * a JSON response (it would serialize as a string and break the UI).
 */
export function num(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : value.toNumber();
}
