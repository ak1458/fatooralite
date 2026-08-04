# Wizard UI Rebuild — Implementation Plan

**Based on:** `docs/12-master-roadmap.md` §3 item 2 & §4  
**Target:** Rebuild the onboarding wizard as a data-driven step registry with 6 independently addressable steps

---

## Current State Analysis

| Aspect | Current (`fatooralite/app/onboarding/page.tsx`) | Target (Roadmap §4) |
|--------|--------------------------------------------------|---------------------|
| Steps | 4 (Company → ZATCA → Locations → Finish) | 6 (Business Identity → Tax Registration → Address & Contact → ZATCA Connection → Branches → Finish) |
| Step isolation | Single-page monolith, step state in local `step` variable | Data-driven step registry; each step independently addressable |
| Step 0 fields | 5 (nameAr, crNumber, address, name, vatNumber read-only) | 15+ fields across 3 steps with validation |
| Validation | Basic required fields only | `zatcaMandatoryCompanySchema` blocking "Next" on step 1 |
| Help links | None | `HelpLink` component on every field in steps 1–3 |
| Post-completion access | None — Settings has no reopen/edit entry points | Settings: "Reconfigure setup" (full wizard) + "Edit this step" (single step) |
| Step routing | Single page with `step` state | Deep-linkable routes per step: `/onboarding/step/:stepId` |

---

## Schema & Data Model — Already Aligned

The Prisma `Company` model (`prisma/schema.prisma`) and Zod schemas (`lib/validation/schemas.ts`) **already contain all fields** required by the 6-step design. No schema migrations needed.

| Step | Fields (from `Company` model & `zatcaMandatoryCompanySchema`) |
|------|---------------------------------------------------------------|
| 1. Business Identity | `name`, `nameAr`, `businessCategory`, `businessCategoryOther`, `crNumber`, `crType`, `crIssueDate`, `crIssuePlace` |
| 2. Tax Registration | `vatNumber`, `vatRegistrationDate`, `economicActivity` |
| 3. Address & Contact | `buildingNumber`, `streetName`, `streetNameAr`, `district`, `districtAr`, `city`, `cityAr`, `postalCode`, `additionalNumber`, `province`, `countryCode`, `contactName`, `contactPhone`, `contactEmail` |
| 4. ZATCA Connection | Existing CSID flow (CCSID → compliance → PCSID) + OTP + live progress |
| 5. Branches/locations | Existing `BranchStep` (kept, minor UI polish) |
| 6. Finish | Summary + next steps |

---

## Implementation Plan — File-Level Changes

### 1. New Core Infrastructure

| File | Purpose | Status |
|------|---------|--------|
| `fatooralite/lib/onboarding/step-registry.ts` | **NEW** — Central step registry: defines step order, IDs, labels, validation schemas, field-to-help-topic mapping, API endpoints for save/load | Create |
| `fatooralite/lib/onboarding/types.ts` | **NEW** — Shared TypeScript types: `OnboardingStep`, `StepConfig`, `StepField`, `OnboardingSessionData` | Create |
| `fatooralite/lib/onboarding/validation.ts` | **NEW** — Validation helpers: `validateStep(stepId, data)` using `zatcaMandatoryCompanySchema` for step 1, partial schemas for steps 2–3 | Create |

### 2. New UI Components (in `fatooralite/components/onboarding/`)

| File | Purpose | Status |
|------|---------|--------|
| `Stepper.tsx` | **NEW** — Reusable stepper with deep-link support (`/onboarding/step/:stepId`), click-to-navigate completed steps | Create |
| `StepLayout.tsx` | **NEW** — Wrapper: stepper + card + error banner + navigation buttons (Back/Next/Skip) | Create |
| `BusinessIdentityStep.tsx` | **NEW** — Step 1 form: all business identity fields + `HelpLink` per field + `zatcaMandatoryCompanySchema` validation on "Next" | Create |
| `TaxRegistrationStep.tsx` | **NEW** — Step 2 form: VAT fields + economic activity + help links | Create |
| `AddressContactStep.tsx` | **NEW** — Step 3 form: national address components + contact + help links | Create |
| `ZatcaConnectionStep.tsx` | **REPLACE** — Refactor existing `ZatcaStep` into standalone component with live per-step progress from `/api/onboarding/activate` streaming response | Refactor |
| `BranchStep.tsx` | **REFINE** — Minor polish: add help links, keep existing API | Refactor |
| `FinishStep.tsx` | **REFINE** — Enhanced summary showing all collected data + "what happens next" | Refactor |
| `HelpLink.tsx` | **EXISTING** — Already exists at `components/onboarding/HelpLink.tsx` with `HelpLinks` helpers | Keep |

### 3. New App Router Pages (Deep-Linkable Steps)

```
fatooralite/app/(app)/onboarding/
├── page.tsx                    # Entry point — redirects to first incomplete step or /dashboard if complete
├── step/
│   ├── [stepId]/
│   │   └── page.tsx           # Dynamic step renderer — loads step config from registry, renders appropriate component
│   └── page.tsx               # Optional: step index / "choose step" landing (for Settings deep links)
└── layout.tsx                 # Optional: shared layout with stepper context
```

| File | Purpose | Status |
|------|---------|--------|
| `fatooralite/app/(app)/onboarding/page.tsx` | **REPLACE** — New entry point: checks `company.onboardingStep`, redirects to `/onboarding/step/<current-step-id>` or `/dashboard` if complete | Replace |
| `fatooralite/app/(app)/onboarding/step/[stepId]/page.tsx` | **NEW** — Dynamic step page: loads step config, fetches company data, renders step component, handles submit → advances to next step | Create |
| `fatooralite/app/(app)/onboarding/layout.tsx` | **NEW** — Optional shared layout for step pages | Create |

### 4. Settings Integration (Post-Completion Access)

| File | Change | Status |
|------|--------|--------|
| `fatooralite/app/(app)/settings/page.tsx` | Add "Reconfigure setup" button (→ `/onboarding/step/business-identity?mode=full`) and "Edit step" dropdown (→ `/onboarding/step/<stepId>?mode=edit`) in Company section | Modify |
| `fatooralite/app/api/companies/[id]/route.ts` | Already supports PATCH with `onboardingStep`/`onboardingStatus` — no change needed | Verify |

**Settings UX:**
- **"Reconfigure setup"** → opens full wizard at step 1 with `mode=full` query param; on completion, returns to Settings
- **"Edit step"** dropdown → opens single step with `mode=edit`; on save, returns to Settings (does not advance wizard)

### 5. API Enhancements

| File | Change | Status |
|------|--------|--------|
| `fatooralite/app/api/onboarding/activate/route.ts` | **ENHANCE** — Stream live progress updates (CCSID requested → compliance checks → PCSID issued) via SSE or chunked response for real-time UI progress | Enhance |
| `fatooralite/app/api/onboarding/step/[stepId]/route.ts` | **NEW** — Generic step save endpoint: `PATCH /api/onboarding/step/:stepId` validates against step schema, updates company + `onboardingStep`, returns next step ID | Create |

### 6. Step Registry Configuration (`step-registry.ts`)

```typescript
// Step definitions — single source of truth for wizard structure
export const ONBOARDING_STEPS: StepConfig[] = [
  {
    id: 'business-identity',
    label: 'Business identity',
    order: 1,
    fields: [
      { name: 'name', label: 'Legal name (English)', required: true, helpTopic: 'legal-name-en', readOnly: true },
      { name: 'nameAr', label: 'Name (Arabic)', required: true, helpTopic: 'legal-name-ar' },
      { name: 'businessCategory', label: 'Business category', type: 'select', options: BUSINESS_CATEGORIES, required: true, helpTopic: 'business-category' },
      { name: 'businessCategoryOther', label: 'Describe "Other"', type: 'text', showWhen: { businessCategory: 'other' }, required: true, helpTopic: 'business-category-other' },
      { name: 'crNumber', label: 'CR number', required: true, pattern: '^\\d{10}$', helpTopic: 'cr-number' },
      { name: 'crType', label: 'CR type', type: 'select', options: CR_TYPES, required: true, helpTopic: 'cr-type' },
      { name: 'crIssueDate', label: 'CR issue date', type: 'date', required: true, helpTopic: 'cr-issue-date' },
      { name: 'crIssuePlace', label: 'CR issue place', required: true, helpTopic: 'cr-issue-place' },
    ],
    validationSchema: 'zatcaMandatoryCompanySchema', // full mandatory validation
    apiEndpoint: '/api/onboarding/step/business-identity',
    nextStepId: 'tax-registration',
  },
  {
    id: 'tax-registration',
    label: 'Tax registration',
    order: 2,
    fields: [
      { name: 'vatNumber', label: 'VAT number', required: true, pattern: '^\\d{15}$', helpTopic: 'vat-number', readOnly: true },
      { name: 'vatRegistrationDate', label: 'VAT registration date', type: 'date', required: true, helpTopic: 'vat-registration-date' },
      { name: 'economicActivity', label: 'Primary economic activity', required: true, helpTopic: 'economic-activity' },
    ],
    validationSchema: 'taxRegistrationSchema', // subset of zatcaMandatoryCompanySchema
    apiEndpoint: '/api/onboarding/step/tax-registration',
    nextStepId: 'address-contact',
  },
  {
    id: 'address-contact',
    label: 'Address & contact',
    order: 3,
    fields: [
      // National address fields
      { name: 'buildingNumber', label: 'Building number', required: true, pattern: '^\\d{4}$', helpTopic: 'building-number' },
      { name: 'streetName', label: 'Street name (EN)', required: true, helpTopic: 'street-name' },
      { name: 'streetNameAr', label: 'Street name (AR)', helpTopic: 'street-name-ar' },
      { name: 'district', label: 'District (EN)', required: true, helpTopic: 'district' },
      { name: 'districtAr', label: 'District (AR)', helpTopic: 'district-ar' },
      { name: 'city', label: 'City (EN)', required: true, helpTopic: 'city' },
      { name: 'cityAr', label: 'City (AR)', helpTopic: 'city-ar' },
      { name: 'postalCode', label: 'Postal code', required: true, pattern: '^\\d{5}$', helpTopic: 'postal-code' },
      { name: 'additionalNumber', label: 'Additional number', required: true, pattern: '^\\d{4}$', helpTopic: 'additional-number' },
      { name: 'province', label: 'Province', helpTopic: 'province' },
      { name: 'countryCode', label: 'Country', type: 'select', options: [{code:'SA',label:'Saudi Arabia'}], default: 'SA', readOnly: true },
      // Contact
      { name: 'contactName', label: 'Contact person', required: true, helpTopic: 'contact-name' },
      { name: 'contactPhone', label: 'Phone', required: true, pattern: '^\\+?\\d{7,15}$', helpTopic: 'contact-phone' },
      { name: 'contactEmail', label: 'Email', required: true, type: 'email', helpTopic: 'contact-email' },
    ],
    validationSchema: 'addressContactSchema',
    apiEndpoint: '/api/onboarding/step/address-contact',
    nextStepId: 'zatca-connection',
  },
  {
    id: 'zatca-connection',
    label: 'ZATCA connection',
    order: 4,
    fields: [
      { name: 'zatcaMode', label: 'Environment', type: 'radio', options: ['sandbox', 'production'], default: 'sandbox' },
      { name: 'otp', label: 'ZATCA portal OTP', required: true, pattern: '^\\d{6}$', helpTopic: 'zatca-otp' },
    ],
    // Special: uses existing /api/onboarding/activate with streaming progress
    validationSchema: 'activateSchema',
    apiEndpoint: '/api/onboarding/activate',
    nextStepId: 'branches',
    isAsync: true,
    progressSteps: ['Requesting certificate…', 'Running compliance checks…', 'Activating production CSID…'],
  },
  {
    id: 'branches',
    label: 'Branches / locations',
    order: 5,
    fields: [
      { name: 'branchName', label: 'Branch name', required: true },
      { name: 'branchCity', label: 'City' },
    ],
    validationSchema: 'branchSchema',
    apiEndpoint: '/api/branches', // existing
    nextStepId: 'finish',
    isRepeatable: true, // can add multiple branches
  },
  {
    id: 'finish',
    label: 'Finish',
    order: 6,
    fields: [], // summary only
    validationSchema: null,
    apiEndpoint: null,
    nextStepId: null,
    isTerminal: true,
  },
];
```

---

## Validation Strategy

| Step | Validation Schema | When Applied |
|------|-------------------|--------------|
| 1. Business Identity | `zatcaMandatoryCompanySchema` (full) | On "Next" click — blocks advance if invalid |
| 2. Tax Registration | Partial schema (vatNumber, vatRegistrationDate, economicActivity required) | On "Next" |
| 3. Address & Contact | Partial schema (all national address + contact fields required) | On "Next" |
| 4. ZATCA Connection | `activateSchema` (OTP format + mode) | On "Connect" |
| 5. Branches | At least one branch exists (existing logic) | On "Continue" |

**Implementation:** `lib/onboarding/validation.ts` exports `validateStep(stepId: string, data: object): { success: boolean; errors: ZodIssue[] }` — each step component calls this on submit.

---

## Deep-Linking & Step Resumption Logic

| Scenario | Behavior |
|----------|----------|
| Fresh user (onboardingStatus=pending, onboardingStep=0) | `/onboarding` → redirects to `/onboarding/step/business-identity` |
| Returning user mid-wizard (onboardingStatus=in_progress, onboardingStep=2) | `/onboarding` → redirects to `/onboarding/step/tax-registration` |
| Completed user (onboardingStatus=complete) | `/onboarding` → redirects to `/dashboard` |
| Settings → "Reconfigure setup" | `/onboarding/step/business-identity?mode=full` — full wizard, on finish returns to Settings |
| Settings → "Edit step: Tax registration" | `/onboarding/step/tax-registration?mode=edit` — single step, on save returns to Settings |
| Direct URL `/onboarding/step/zatca-connection` | Allowed only if previous steps complete (validated server-side) |

**Server-side guard** in `page.tsx`: fetch company, verify `onboardingStep >= stepOrder - 1` for the requested step, else redirect to correct step.

---

## Migration Checklist

| Phase | Tasks | Files |
|-------|-------|-------|
| **1. Core infra** | Create step registry, types, validation helpers | `lib/onboarding/step-registry.ts`, `lib/onboarding/types.ts`, `lib/onboarding/validation.ts` |
| **2. Step components** | Build 4 new step components + refactor 2 existing | `components/onboarding/*.tsx` (6 files) |
| **3. Stepper & layout** | Deep-linkable stepper, shared step layout | `components/onboarding/Stepper.tsx`, `StepLayout.tsx` |
| **4. App router pages** | Replace `onboarding/page.tsx`, add dynamic step route | `app/(app)/onboarding/page.tsx`, `app/(app)/onboarding/step/[stepId]/page.tsx` |
| **5. API** | Add generic step save endpoint, enhance activate streaming | `app/api/onboarding/step/[stepId]/route.ts`, enhance `activate/route.ts` |
| **6. Settings integration** | Add reopen/edit entry points | `app/(app)/settings/page.tsx` |
| **7. Testing** | Verify each step validates correctly, deep links work, Settings round-trips work | Manual + unit tests for validation helpers |

---

## Breaking Changes & Backward Compatibility

| Change | Impact | Mitigation |
|--------|--------|------------|
| URL structure: `/onboarding` → `/onboarding/step/:stepId` | Bookmarks/links break | Old `/onboarding` page redirects to correct step based on `onboardingStep` |
| `onboardingStep` int (0–3) → step ID string | DB values change meaning | Migration script: map 0→business-identity, 1→tax-registration, 2→address-contact, 3→zatca-connection, 4→branches, 5→finish. Or keep int in DB, map in code. **Recommendation:** keep int in DB (0–5), map to step IDs in registry. |
| Company API PATCH payload | No change — uses `patchCompanySchema` which already accepts all fields | None |

---

## Dependencies & Parallel Work

| Dependency | Status | Notes |
|------------|--------|-------|
| `zatcaMandatoryCompanySchema` | ✅ Exists in `lib/validation/schemas.ts` | Ready to use for step 1 validation |
| `BUSINESS_CATEGORIES` | ✅ Exists in `lib/constants/business-categories.ts` | Ready for dropdown |
| `HelpLink` + `HelpLinks` | ✅ Exists in `components/onboarding/HelpLink.tsx` | Ready to wire into steps 1–3 |
| ZATCA activate endpoint | ✅ Exists at `/api/onboarding/activate` | Needs streaming enhancement for live progress |
| Branch API | ✅ Exists at `/api/branches` | Step 5 reuses existing logic |
| Prisma Company model | ✅ Has all required fields | No migration needed |

---

## Estimated Effort

| Area | Files | Est. Days |
|------|-------|-----------|
| Core infra (registry, types, validation) | 3 | 0.5 |
| Step components (6) | 6 | 2.0 |
| Stepper + layout | 2 | 0.5 |
| App router pages (entry + dynamic step) | 2 | 1.0 |
| API endpoints (step save + activate streaming) | 2 | 1.0 |
| Settings integration | 1 | 0.5 |
| Testing & polish | — | 1.0 |
| **Total** | **16** | **~6.5 days** |

---

## Acceptance Criteria (Definition of Done)

1. **Step 1 (Business Identity)** validates against `zatcaMandatoryCompanySchema` — "Next" disabled until all mandatory fields pass
2. **Steps 1–3** each show `HelpLink` on every field pointing to `/docs/onboarding#<topic>`
3. **Each step** accessible via `/onboarding/step/<step-id>` — refresh preserves step state
4. **Settings page** has "Reconfigure setup" (opens full wizard) and "Edit step" dropdown (opens single step)
5. **ZATCA step** shows live per-step progress (CCSID → compliance → PCSID) from streaming API response
6. **Branch step** retained with minimal changes + help links
7. **Finish step** shows complete summary of all collected data + "what happens next"
8. **No schema migrations** required — all fields already exist in Prisma + Zod
9. **tsc --noEmit clean**, existing tests pass

---

## Notes for Implementer

- **Start with the registry** — it drives everything else (step order, field config, validation, routing)
- **Reuse existing patterns** — `CompanyStep`, `ZatcaStep`, `BranchStep`, `FinishStep` in current `page.tsx` are good reference implementations
- **Keep components pure** — step components receive `company`, `onSave(data)`, `onBack()`, `onNext()`, `busy`, `error` props; no direct router/api calls inside
- **Validation is centralized** — `validateStep()` in `lib/onboarding/validation.ts` is the single source of truth
- **Streaming activate endpoint** — use `ReadableStream` + `TextEncoder` to push progress events; frontend consumes via `EventSource` or fetch+stream reader
- **Settings deep links** — use `mode=full|edit` query param to control wizard behavior (return-to-settings vs. continue-wizard)