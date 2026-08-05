import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Turns a thrown validation error into the same 400 shape every hand-parsed
 * route already returns (`{ error: "<first issue message>" }`), or null when
 * the error is not a validation failure and the caller should keep handling it.
 *
 * The routes that needed this were written as `catch (error: any)` with
 * `if (error.name === "ZodError") return ... error.errors`. Two problems the
 * `any` was hiding: zod v4 renamed `.errors` to `.issues`, so those handlers
 * returned `{ error: undefined }` — a 400 that told the caller nothing about
 * what was wrong — and duck-typing on `.name` matches anything that happens to
 * carry that string. `instanceof` is both correct and free.
 */
export function zodErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof ZodError)) return null;
  return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
}
