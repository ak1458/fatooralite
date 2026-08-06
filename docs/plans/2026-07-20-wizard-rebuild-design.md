# Wizard UI Rebuild — Implementation Plan
**Roadmap §3 Item 2** — Rebuild the onboarding wizard as a data-driven step registry with individually addressable, resumable, re-enterable steps.

---

## Executive Summary

The current wizard (`fatooralite/app/onboarding/page.tsx`) is a **4-step hardcoded flow** that only collects basic company fields. The roadmap §4 design calls for a **6-step data-driven wizard** collecting the full ZATCA-mandatory field set from the expanded Company model.

**Good news**: The step registry (`lib/onboarding/steps.ts`) already exists with the exact 6-step design from roadmap §4. The Company Prisma model has all ZATCA-mandatory fields. Validation schemas (`zatcaMandatoryCompanySchema`) exist. Onboarding lifecycle fields (`onboardingStatus`, `onboardingStep`) exist on Company. The ZATCA activation endpoint (`/api/onboarding/activate`) exists.

**Work required**: Rebuild `app/onboarding/page.tsx` to consume the step registry, create step components for steps 1–3 (Business Identity, Tax Registration, Address & Contact), wire validation gating using `zatcaMandatoryCompanySchema`, add `HelpLink` component architecture (roadmap §3 item 4), and wire Settings "Reconfigure setup" / "Edit this step" entry points.

---

## Current vs Target State

| Aspect | Current (4-step) | Target (6-step, data-driven) |
|--------|------------------|------------------------------|
| **Step registry** | Hardcoded `STEPS` array in page.tsx | `ONBOARDING_STEPS` in `lib/onboarding/steps.ts` ✅ exists |
| **Step 1: Company** | name, nameAr, crNumber, address (legacy free-text) | **Business Identity**: name, nameAr, businessCategory (+Other), crNumber, crType, crIssueDate, crIssuePlace |
| **Step 2: ZATCA** | CSID flow (existing ZatcaStep) | **Tax Registration**: vatNumber, vatRegistrationDate, economicActivity |
| **Step 3: Locations** | BranchStep (existing) | **Address & Contact**: buildingNumber, streetName/Ar, district/Ar, city/Ar, postalCode, additionalNumber, province, countryCode, contactName, contactPhone, contactEmail |
| **Step 4: Finish** | FinishStep (existing) | **ZATCA Connection** (existing ZatcaStep, moved to step 4) |
| **Step 5** | — | **Branches & Locations** (existing BranchStep, moved to step 5) |
| **Step 6** | — | **Finish** (existing FinishStep, moved to step 6) |
| **Validation gating** | None (only basic required) | `zatcaMandatoryCompanySchema` gates "Next" on steps 1–3 |
| **Resume/re-enter** | `onboardingStep` used but steps not addressable | Steps individually addressable via registry keys; Settings can deep-link to any step |
| **Contextual help** | None | `HelpLink` component wired to every non-obvious field (architecture only, content later) |
| **Settings integration** | None | "Reconfigure setup" (full wizard) + "Edit this step" (single step) entry points |

---

## File-Level Tasks

### 1. Core Wizard Page — `fatooralite/app/onboarding/page.tsx` (REWRITE)
**Replace the entire file** with a data-driven wizard that:
- Imports `ONBOARDING_STEPS`, `getStep`, `getStepByOrder`, `getNextStep`, `getPrevStep` from `@/lib/onboarding/steps`
- Uses `company.onboardingStep` (0–5) to determine current step via `getStepByOrder`
- Renders step component dynamically via a step component map
- Passes `company`, `busy`, `onNext`, `onBack`, `onSkip` (where applicable) to each step
- Handles step completion by calling `patchCompany({ onboardingStep: nextStep, onboardingStatus: "in_progress", ...stepData })`
- On final step completion, calls `/api/onboarding/local-cert` then patches `onboardingStatus: "complete", onboardingStep: 6`
- Shows `Stepper` component driven by `ONBOARDING_STEPS` (not hardcoded `STEPS`)

### 2. Step Components (NEW FILES) — `fatooralite/app/onboarding/steps/`
Create a new directory with one component per step:

| File | Step | Fields Collected | Validation Schema |
|------|------|------------------|-------------------|
| `BusinessIdentityStep.tsx` | 1 (order 0) | name, nameAr, businessCategory, businessCategoryOther, crNumber, crType, crIssueDate, crIssuePlace | `zatcaMandatoryCompanySchema` |
| `TaxRegistrationStep.tsx` | 2 (order 1) | vatNumber, vatRegistrationDate, economicActivity | `zatcaMandatoryCompanySchema` |
| `AddressContactStep.tsx` | 3 (order 2) | buildingNumber, streetName, streetNameAr, district, districtAr, city, cityAr, postalCode, additionalNumber, province, countryCode, contactName, contactPhone, contactEmail | `zatcaMandatoryCompanySchema` |
| `ZatcaConnectionStep.tsx` | 4 (order 3) | — (existing ZatcaStep logic) | — (optional, skippable) |
| `BranchesStep.tsx` | 5 (order 4) | — (existing BranchStep logic) | — |
| `FinishStep.tsx` | 6 (order 5) | — (existing FinishStep logic) | — |

**Each step component must:**
- Accept props: `company`, `busy`, `onNext(data)`, `onBack()`, `onSkip?()`, `setError`, `setBusy`
- Use `HelpLink` component on every non-obvious field (see §5)
- Validate against `zatcaMandatoryCompanySchema` (steps 1–3) before calling `onNext`
- Show field-level validation errors inline
- Pre-populate from `company` object
- Support RTL for Arabic fields (`dir="rtl"`)

### 3. Shared UI Components — `fatooralite/components/onboarding/`
| File | Purpose |
|------|---------|
| `Stepper.tsx` | Replaces inline `Stepper` in page.tsx; driven by `ONBOARDING_STEPS`; shows completed/current/pending; clickable completed steps for re-entry (when not in wizard flow) |
| `StepTitle.tsx` | Replaces inline `StepTitle`; accepts `title`, `sub`, optional `helpTopic` |
| `HelpLink.tsx` | **New** — contextual help link component (roadmap §3 item 4 architecture). Props: `topic: string`, `field?: string`, `children?`. Renders an info icon/link that opens documentation (stub: `console.log` + tooltip for now; real doc links later via roadmap §3 item 6/7). |
| `FieldWrapper.tsx` | Wrapper for form fields: label, input, error message, `HelpLink`, RTL support |
| `ValidationError.tsx` | Inline field-level error display |

### 4. Validation Utilities — `fatooralite/lib/onboarding/validation.ts` (NEW)
```typescript
import { zatcaMandatoryCompanySchema } from "@/lib/validation/schemas";
import { getStep } from "@/lib/onboarding/steps";

export function validateStepData(stepKey: OnboardingStepKey, data: Record<string, unknown>) {
  const step = getStep(stepKey);
  if (!step?.validationSchema) return { success: true, data };

  // For steps 1-3, use zatcaMandatoryCompanySchema but only validate fields for that step
  const schema = zatcaMandatoryCompanySchema.pick(
    step.fields.reduce((acc, f) => ({ ...acc, [f]: true }), {})
  );
  return schema.safeParse(data);
}

export function getStepValidationSchema(stepKey: OnboardingStepKey) {
  const step = getStep(stepKey);
  if (!step?.validationSchema) return null;
  // Return a partial schema for the step's fields only
}
```

### 5. Settings Integration — `fatooralite/app/(app)/settings/page.tsx` (MODIFY)
Add to the "Company" section:
- **"Reconfigure setup"** button → navigates to `/onboarding?reopen full wizard from step 1 (sets `onboardingStatus: "in_progress", onboardingStep: 0` via API)
- **"Edit this step"** dropdown/button per completed step → deep-links to `/onboarding?step=business-identity` (or any step key)
- Show current onboarding status badge (pending / in_progress / complete)
- Show step completion checklist with links to edit each step

**New API endpoint needed**: `PATCH /api/companies/[id]/onboarding/reset` or reuse `PATCH /api/companies/[id]` with `onboardingStatus: "in_progress", onboardingStep: 0`

### 6. Deep-Link Support — `fatooralite/app/onboarding/page.tsx` (MODIFY)
On mount:
- If `?step=business-identity` (or any step key) in query string AND user has completed onboarding (`onboardingStatus === "complete"`), jump to that step for editing
- If `onboardingStatus === "in_progress"`, resume at `onboardingStep`
- If `onboardingStatus === "pending"`, start at step 0

### 7. HelpLink Architecture — `fatooralite/components/onboarding/HelpLink.tsx` (NEW)
```typescript
interface HelpLinkProps {
  topic: string;           // e.g., "business-identity", "vat-registration"
  field?: string;          // e.g., "crType", "buildingNumber"
  children?: React.ReactNode;
  className?: string;
}

// For now: renders an info icon with tooltip "Documentation coming soon"
// Later: links to arranto.com/support/fatoora-lite-pro/#{topic}-{field}
export function HelpLink({ topic, field, children }: HelpLinkProps) {
  const href = `/support/fatoora-lite-pro#${topic}${field ? `-${field}` : ""}`;
  return (
    <a href={href} target="_blank" rel="noopener" className={className}>
      {children ?? <InfoIcon />}
    </a>
  );
}
```
**Wire to every non-obvious field** in steps 1–3 (businessCategory, crType, crIssueDate, crIssuePlace, vatRegistrationDate, economicActivity, all national address fields, invoiceTypes, iban, bankName, etc.)

---

## Data Structures

### Step Registry (already exists in `lib/onboarding/steps.ts`)
```typescript
type OnboardingStepKey =
  | "business-identity"
  | "tax-registration"
  | "address-contact"
  | "zatca-connection"
  | "branches"
  | "finish";

interface OnboardingStepConfig {
  key: OnboardingStepKey;
  label: string;
  description: string;
  fields: string[];                    // Company model fields this step collects
  validationSchema?: "zatcaMandatoryCompanySchema" | "updateCompanySchema" | "patchCompanySchema";
  optional?: boolean;                  // Can skip (zatca-connection only)
  order: number;                       // 0–5
  helpTopic: string;                   // Documentation section slug
}
```

### Company Onboarding State (Prisma)
```prisma
onboardingStatus String @default("pending") // pending | in_progress | complete
onboardingStep   Int     @default(0)        // 0–5 (maps to step order)
```

### Validation Gating Strategy
- **Steps 1–3 (Business Identity, Tax Registration, Address & Contact)**: Validate **only that step's fields** against `zatcaMandatoryCompanySchema` using a partial pick. Block "Next" until valid.
- **Step 4 (ZATCA Connection)**: Optional — `onSkip` advances to step 5
- **Step 5 (Branches)**: Require at least 1 branch before "Next"
- **Step 6 (Finish)**: No validation; calls `/api/onboarding/local-cert` then marks complete

---

## Migration Strategy: 4-Step → 6-Step

### Phase 1: Core Infrastructure (Day 1)
1. Create `components/onboarding/` shared components (`Stepper`, `StepTitle`, `HelpLink`, `FieldWrapper`, `ValidationError`)
2. Create `lib/onboarding/validation.ts` utilities
3. Create step component directory `app/onboarding/steps/`
4. Extract existing `ZatcaStep`, `BranchStep`, `FinishStep` into the new step component structure (minimal changes — just prop interface alignment)

### Phase 2: New Step Components (Day 1–2)
5. Build `BusinessIdentityStep.tsx` — most complex: business category dropdown (13 codes + "other" with conditional free-text), CR type dropdown, date pickers for CR issue date / VAT registration date
6. Build `TaxRegistrationStep.tsx` — VAT number (read-only, from registration), VAT registration date, economic activity (free text, ISIC code hint via HelpLink)
7. Build `AddressContactStep.tsx` — Saudi national address form (building #, street EN/AR, district EN/AR, city EN/AR, postal code, additional #, province, countryCode default "SA"), contact person, phone, email

### Phase 3: Wizard Page Rewrite (Day 2)
8. Rewrite `app/onboarding/page.tsx` to consume `ONBOARDING_STEPS` registry
9. Implement dynamic step rendering via component map
10. Wire validation gating using `validateStepData()`
11. Implement resume logic: `onboardingStatus === "in_progress"` → jump to `onboardingStep`
12. Implement deep-link editing: `?step=business-identity` → jump to that step if onboarding complete

### Phase 4: Settings Integration (Day 2–3)
13. Add "Reconfigure setup" button to Settings → Company section
14. Add "Edit step" links for each completed step (show checklist)
15. Add API endpoint or reuse `PATCH /api/companies/[id]` to reset onboarding status

### Phase 5: HelpLink Wiring (Day 3)
16. Add `HelpLink` to every non-obvious field in steps 1–3
17. Map each field to a `helpTopic` + `field` slug (architecture only; content in roadmap §3 items 6–7)

### Phase 6: Testing & Polish (Day 3)
18. Test fresh onboarding flow (pending → complete)
19. Test resume (in_progress at step 2 → continue)
20. Test re-enter (complete → Settings → "Edit step" → business-identity → save → return)
21. Test ZATCA connection skip/connect flow still works
22. Test branches step requires ≥1 branch
23. TypeScript clean (`tsc --noEmit`), tests pass

---

## Validation Rules Detail (per `zatcaMandatoryCompanySchema`)

### Step 1: Business Identity
| Field | Required | Validation |
|-------|----------|------------|
| name | Yes | min 1, max 100 |
| businessCategory | Yes | enum of 13 codes + "other" |
| businessCategoryOther | If category="other" | max 200, required when other |
| crNumber | Yes | 10 digits regex |
| crType | Yes | enum: CRN, MOM, MLS, SAG, 700, OTH |
| crIssueDate | Yes | YYYY-MM-DD regex |
| crIssuePlace | No (ZATCA optional?) | max 100 |

### Step 2: Tax Registration
| Field | Required | Validation |
|-------|----------|------------|
| vatNumber | Yes (pre-filled) | 15 digits |
| vatRegistrationDate | Yes | YYYY-MM-DD |
| economicActivity | Yes | min 1, max 200 |

### Step 3: Address & Contact
| Field | Required | Validation |
|-------|----------|------------|
| buildingNumber | Yes | 4 digits |
| streetName | Yes | min 1, max 150 |
| streetNameAr | No | max 150 |
| district | Yes | min 1, max 100 |
| districtAr | No | max 100 |
| city | Yes | min 1, max 100 |
| cityAr | No | max 100 |
| postalCode | Yes | 5 digits |
| additionalNumber | Yes | 4 digits |
| province | No | max 100 |
| countryCode | Default "SA" | literal "SA" |
| contactName | Yes | min 1, max 100 |
| contactPhone | Yes | phone regex |
| contactEmail | Yes | email regex |

### Conditional: invoiceTypes, iban, bankName
Per schema, these are in `zatcaMandatoryCompanySchema` but not in the step registry fields. **Decision**: Add to Address & Contact step (or new sub-step) since they're required for completion. Update step registry `fields` array accordingly.

---

## API Changes Needed

| Endpoint | Change |
|----------|--------|
| `PATCH /api/companies/[id]` | Already accepts all profile fields + `onboardingStatus`, `onboardingStep`. No change needed. |
| `POST /api/onboarding/activate` | Exists — used by ZatcaConnectionStep. No change. |
| `POST /api/onboarding/local-cert` | Exists — used by FinishStep. No change. |
| `PATCH /api/companies/[id]/onboarding/reset` | **NEW** — Settings "Reconfigure setup" calls this to set `onboardingStatus: "in_progress", onboardingStep: 0` |
| `GET /api/companies/[id]/onboarding/state` | **NEW (optional)** — Returns current step, status, completed steps for Settings UI |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Step registry drift** | Single source of truth in `lib/onboarding/steps.ts`; wizard page and Settings both import from it |
| **Validation mismatch** | Use `zatcaMandatoryCompanySchema.pick()` per step; unit test each step's validation |
| **Resume logic bugs** | Test matrix: pending→step0, in_progress→stepN, complete→edit step, complete→reconfigure |
| **HelpLink dead links** | Architecture only for now; `href` points to `/support/...` which returns 404 until docs published (roadmap §3 items 6–7) |
| **Breaking existing ZATCA flow** | ZatcaConnectionStep, BranchStep, FinishStep extracted with minimal changes; same props/API calls |

---

## Acceptance Criteria

1. **Fresh onboarding**: New user sees 6 steps, completes all, reaches dashboard with `onboardingStatus: "complete", onboardingStep: 6`
2. **Validation gating**: Cannot advance past steps 1–3 without all required fields valid per `zatcaMandatoryCompanySchema`
3. **Resume**: User closes browser at step 2, returns → lands on step 2 with data pre-filled
4. **Re-enter**: Completed user goes Settings → "Edit step: Tax registration" → edits VAT registration date → saves → returns to Settings
5. **Reconfigure**: Completed user goes Settings → "Reconfigure setup" → full 6-step wizard resets, pre-filled with current data
6. **ZATCA skip/connect**: Step 4 still allows skip or full OTP flow
7. **Branches**: Step 5 still requires ≥1 branch
8. **HelpLink**: Every non-obvious field in steps 1–3 shows HelpLink icon (tooltip for now)
9. **TypeScript clean**: `tsc --noEmit` passes
10. **Tests pass**: Existing 89 tests + new step validation tests

---

## Estimated Effort

| Phase | Files | Est. Days |
|-------|-------|-----------|
| Core infrastructure | 5 new files | 0.5 |
| New step components (3) | 3 new files | 1.5 |
| Wizard page rewrite | 1 rewrite | 0.5 |
| Settings integration | 1 modify + 1 API | 0.5 |
| HelpLink wiring | 1 new + 3 modifies | 0.5 |
| Testing & polish | — | 0.5 |
| **Total** | **~11 files** | **~3.5 days** |

---

## Appendix: Step Registry Field Mapping to Company Model

```prisma
// Business Identity (step 1)
businessCategory      String?  // enum code
businessCategoryOther String?  // required when "other"
crNumber              String?  // 10 digits
crType                String?  // CRN|MOM|MLS|SAG|700|OTH
crIssueDate           String?  // YYYY-MM-DD
crIssuePlace          String?

// Tax Registration (step 2)
vatNumber             String   @unique // 15 digits
vatRegistrationDate   String?  // YYYY-MM-DD
economicActivity      String?  // ISIC/activity

// Address & Contact (step 3)
buildingNumber        String?  // 4 digits
streetName            String?
streetNameAr          String?
district              String?
districtAr            String?
city                  String?
cityAr                String?
postalCode            String?  // 5 digits
additionalNumber      String?  // 4 digits
province              String?
countryCode           String?  @default("SA")
contactName           String?
contactPhone          String?
contactEmail          String?
invoiceTypes          String?  // standard|simplified|both
iban                  String?  // SA + 22 digits
bankName              String?
```

---

*End of Plan*