import type { PrismaClient } from "@prisma/client";
import type { ZatcaResponse, ZatcaSubmitter, SubmitArgs, ZatcaAction } from "@/lib/zatca/client";

/**
 * Small, shared fault-injection helpers (Phase 3 / W16).
 *
 * Not a framework — this codebase's existing style (inline stubs in
 * lib/services/clearance-crash.test.ts, lib/services/reconcile.test.ts,
 * lib/ai/providers/*.test.ts) already fits how it tests failure paths; a
 * heavyweight harness would fight that rather than help it. This exists so
 * the handful of common fault shapes (timeout, network error, rejection,
 * malformed response, N-then-succeed) aren't hand-rolled per test file.
 *
 * Test-only. Not imported by any production code path.
 */

// ---- ZATCA gateway faults --------------------------------------------------

export type ScriptedStep =
  | { kind: "accept"; action?: ZatcaAction }
  | { kind: "reject"; code?: string; message?: string }
  | { kind: "timeout" } // rejects like a real AbortSignal.timeout() firing
  | { kind: "network" } // rejects like a DNS/connection failure
  | { kind: "malformed" }; // "accepts" with a response that fails to parse as expected

/**
 * A ZatcaSubmitter that plays back a scripted sequence of outcomes, one per
 * call, and records every call's args. Exhausting the script keeps repeating
 * its last step — a test that only cares about the first N calls doesn't
 * need to pad the script to an exact length.
 */
export function scriptedSubmitter(steps: ScriptedStep[]): { submitter: ZatcaSubmitter; calls: SubmitArgs[] } {
  const calls: SubmitArgs[] = [];
  let i = 0;
  const submitter: ZatcaSubmitter = {
    actionFor: (kind) => (kind === "standard" ? "clearance" : "reporting"),
    async submit(args: SubmitArgs): Promise<ZatcaResponse> {
      calls.push(args);
      const step = steps[Math.min(i, steps.length - 1)];
      i++;
      const action = ("action" in step && step.action) || (args.input.kind === "standard" ? "clearance" : "reporting");
      switch (step.kind) {
        case "accept":
          return { action, status: "accepted", code: "ACCEPTED", message: "ok", raw: JSON.stringify({ status: "accepted" }) };
        case "reject":
          return {
            action, status: "rejected", code: step.code ?? "BR-KSA-00",
            message: step.message ?? "Rejected by ZATCA", raw: JSON.stringify({ status: "rejected" }),
          };
        case "timeout": {
          const e = new Error("The operation was aborted due to timeout");
          e.name = "TimeoutError";
          throw e;
        }
        case "network": {
          const e = new Error("fetch failed");
          e.name = "TypeError";
          throw e;
        }
        case "malformed":
          return { action, status: "accepted", code: "", message: "", raw: "not json {{{" };
      }
    },
  };
  return { submitter, calls };
}

/** Fails the first `n` calls (network fault), then accepts every call after. */
export function submitterFailingNTimes(n: number): { submitter: ZatcaSubmitter; calls: SubmitArgs[] } {
  return scriptedSubmitter([
    ...Array.from({ length: n }, () => ({ kind: "network" as const })),
    { kind: "accept" },
  ]);
}

// ---- Database faults --------------------------------------------------------

/**
 * Wraps a real Prisma client so the first `failTimes` calls to
 * `db[model][action](...)` throw `error` instead of running, then calls
 * pass through untouched. Everything else on the client is untouched —
 * this only intercepts the one method named, so `db.$transaction` and every
 * other model/action work exactly as the real client.
 */
export function faultyDb<T extends PrismaClient>(
  db: T,
  opts: { model: keyof T; action: string; failTimes?: number; error?: Error },
): T {
  let remaining = opts.failTimes ?? 1;
  const err = opts.error ?? new Error("simulated database failure");
  const realModel = db[opts.model] as unknown as Record<string, (...args: unknown[]) => unknown>;
  const wrappedModel = new Proxy(realModel, {
    get(target, prop, receiver) {
      if (prop === opts.action) {
        return (...args: unknown[]) => {
          if (remaining > 0) {
            remaining--;
            return Promise.reject(err);
          }
          return Reflect.get(target, prop, receiver).apply(target, args);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === opts.model) return wrappedModel;
      return Reflect.get(target, prop, receiver);
    },
  }) as T;
}

// ---- AI provider faults -------------------------------------------------

/** A ChatProvider-shaped stub (see lib/ai/provider.ts) whose chatWithTools rejects, matching a real timeout/network failure. */
export function failingChatProvider(mode: "timeout" | "network" = "timeout") {
  return {
    name: "fault-injected",
    isConfigured: () => true,
    async chatWithTools(): Promise<never> {
      const e = new Error(mode === "timeout" ? "The operation was aborted due to timeout" : "fetch failed");
      e.name = mode === "timeout" ? "TimeoutError" : "TypeError";
      throw e;
    },
    async chatText(): Promise<never> {
      throw new Error("fault-injected provider failure");
    },
    async chatStream(): Promise<ReadableStream<Uint8Array>> {
      throw new Error("fault-injected provider failure");
    },
  };
}
