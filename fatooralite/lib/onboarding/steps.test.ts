import { describe, it, expect } from "vitest";
import { ONBOARDING_STEPS, getStepKeys, getNextStep, getPrevStep } from "./steps";
import { zatcaMandatoryCompanySchema } from "@/lib/validation/schemas";

/**
 * Every field `zatcaMandatoryCompanySchema` requires is derived from the schema
 * itself rather than hand-listed, so adding a mandatory field without adding it
 * to a wizard step fails here instead of failing a real tenant at the last
 * click of onboarding.
 */
function requiredMandatoryFields(): string[] {
  const result = zatcaMandatoryCompanySchema.safeParse({});
  if (result.success) throw new Error("expected an empty object to be rejected");
  return [...new Set(result.error.issues.map((i) => String(i.path[0])))];
}

describe("ONBOARDING_STEPS", () => {
  it("collects every field required to complete onboarding", () => {
    const collected = new Set(ONBOARDING_STEPS.flatMap((s) => s.fields));
    const missing = requiredMandatoryFields().filter((f) => !collected.has(f));
    expect(missing).toEqual([]);
  });

  it("has contiguous zero-based order matching array position", () => {
    ONBOARDING_STEPS.forEach((s, i) => expect(s.order).toBe(i));
  });

  it("has unique keys", () => {
    const keys = getStepKeys();
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("links steps in both directions with null at the ends", () => {
    const keys = getStepKeys();
    expect(getPrevStep(keys[0])).toBeNull();
    expect(getNextStep(keys[keys.length - 1])).toBeNull();
    for (let i = 0; i < keys.length - 1; i++) {
      expect(getNextStep(keys[i])).toBe(keys[i + 1]);
      expect(getPrevStep(keys[i + 1])).toBe(keys[i]);
    }
  });
});
