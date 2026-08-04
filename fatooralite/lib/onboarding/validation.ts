import type { ZodTypeAny } from "zod";
import {
  addressContactStepSchema,
  businessIdentityStepSchema,
  taxRegistrationStepSchema,
} from "@/lib/validation/schemas";

/**
 * A validation failure attributed to a specific form field.
 *
 * The wizard previously validated with functions that returned a bare message
 * and derived the field key from `message.split(" ")[0]`. That worked only
 * while every message happened to start with its own field name, so
 * "Postal code is 5 digits" keyed to `Postal` and "Enter a valid email" keyed
 * to `Enter` — neither of which is a field, so those errors rendered nowhere
 * and the step just refused to advance with no visible reason. Carrying the
 * field explicitly removes the guesswork.
 */
export interface FieldError {
  field: string;
  message: string;
}

/** First issue from `schema`, or null when `data` is valid. */
export function firstFieldError(schema: ZodTypeAny, data: unknown): FieldError | null {
  const result = schema.safeParse(data);
  if (result.success) return null;
  const issue = result.error.issues[0];
  return { field: String(issue?.path[0] ?? ""), message: issue?.message ?? "Invalid input" };
}

export function validateBusinessIdentity(data: unknown): FieldError | null {
  return firstFieldError(businessIdentityStepSchema, data);
}

export function validateTaxRegistration(data: unknown): FieldError | null {
  return firstFieldError(taxRegistrationStepSchema, data);
}

export function validateAddressContact(data: unknown): FieldError | null {
  return firstFieldError(addressContactStepSchema, data);
}

/**
 * Empty text inputs arrive as `""`. The mandatory schemas reject `""` on their
 * own, but the PATCH payload wants `null` for "not provided" so a cleared
 * optional field is actually cleared rather than stored as an empty string.
 */
export function blankToNull<T extends Record<string, string>>(values: T): Record<keyof T, string | null> {
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, v.trim() === "" ? null : v]),
  ) as Record<keyof T, string | null>;
}
