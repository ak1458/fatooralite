# Fatoora Lite Pro — Master Roadmap (Onboarding-First Rebuild)

**Added:** 2026-07-19 · **Status:** Planning — nothing in this document is implemented yet.
This is the forward-looking vision + priority layer sitting above docs 00–11, which
remain the technical source of truth for what is already built.

---

## 1. Where the product actually stands (verified against the codebase, not memory)

The engineering foundation is real and complete through Phase 5 of the original
roadmap ([07-roadmap.md](./07-roadmap.md)), confirmed by `tsc --noEmit` clean and
89/89 unit tests passing on `feature/production-readiness`:

- ZATCA Phase-2 crypto engine (keygen, CSR, ECDSA-SHA256, XAdES, C14N-11, PIH
  chaining, TLV QR) — real, tested, self-consistent.
- Real auth (scrypt + jose sessions), self-serve registration, RBAC with custom
  DB-backed roles.
- Real invoicing: create → sign → clear/report → PDF, credit/debit notes.
- Compliance Center, Audit Vault, Analytics, Reports — wired to live DB data, no
  mock fallbacks left ([06-gap-analysis.md](./06-gap-analysis.md) is fully closed).
- AI stack: provider-agnostic (OpenRouter/Anthropic/OpenAI), RAG on pgvector,
  tool-calling agent with confirm-before-write, global dock.
- Users & Roles, Notifications, full Settings.
- The **automated ZATCA onboarding pipeline** (CCSID → compliance checks → PCSID)
  is ~80% built server-side per [11-onboarding-pipeline-handoff.md](./11-onboarding-pipeline-handoff.md):
  the three gateway calls, CSR builder, and cert storage all exist. **Not yet
  done:** a single orchestration endpoint, and a live round-trip against the real
  ZATCA sandbox (needs a Fatoora simulation-portal OTP, which requires a human to
  register there — this is an external dependency, not a coding gap).

**What does NOT yet exist — the actual gap this roadmap closes:**

The current `/onboarding` wizard (`fatooralite/app/onboarding/page.tsx`) is a
**4-step technical flow**: Company → ZATCA connection → Locations → Finish. Its
"Company" step only collects what the `Company` Prisma model has room for —
`name`, `nameAr`, `vatNumber`, `crNumber`, `address` (all optional except VAT
number). That's it. There is:

- No business-category selection (retail, restaurant, professional services,
  construction, healthcare, etc.) and no "Other" option.
- No comprehensive ZATCA-mandatory field set beyond VAT number (CR issue
  date/place, CR type, national address components, industry sector, invoice
  types the business will issue, bank/IBAN, contact person, etc.).
- No field-level contextual help ("How do I find this?") anywhere.
- No inline validation blocking advance to the next step beyond basic required-ness.
- No way to edit a single completed step later without re-running the whole
  wizard — Settings has no "reopen onboarding" or "edit step" entry point.
- No documentation portal integration (arranto.com Support section doesn't exist
  yet as a target) and no AI-in-onboarding hooks.

This is exactly the pain point named in the brief: existing ZATCA compliance
tools take days to onboard because they assume the merchant already understands
CR types, VAT registration mechanics, and ZATCA's CSID lifecycle. The current
build has the hard cryptographic onboarding done, but the **human** onboarding —
the part that actually determines whether an SME owner with zero compliance
knowledge can self-serve — hasn't been designed yet.

---

## 2. Vision

Fatoora Lite Pro should be the ZATCA compliance product an SME owner can set up
alone, start to finish, in one sitting — no accountant, no integrator, no phone
call to support. The wizard is the product's main competitive edge, not a
formality before reaching the "real" app.

Non-negotiables carried from the brief:
- Not enterprise-shaped. Every step assumes the user has never heard of ZATCA,
  CSID, or UBL.
- Broad, flexible forms per business category — not a minimal form with one
  generic path. Include an **Other** category with free-text description for
  any business type not explicitly listed.
- Every mandatory-for-compliance field is collected, validated before advancing.
- Every non-obvious field carries a "How do I find this?" link into real
  documentation (what it means, why required, where to get it, steps,
  screenshots).
- Documentation lives centrally on **arranto.com → Support**, one structured
  section per product — this becomes the company's shared knowledge base, not
  something reinvented per product.
- Architecture leaves room for an AI assistant to eventually answer questions
  and drive the wizard itself — not built now (no API access yet), but nothing
  in the design should have to be undone to add it later.
- After the wizard, users can reopen it, redo the whole thing, or edit exactly
  one step — never locked into the first answer.

---

## 3. Gap → priority list

| # | Gap | Priority |
|---|---|---|
| 1 | Expand `Company` data model: business-category taxonomy (+ Other), full ZATCA-mandatory field set | HIGH — everything else depends on the schema |
| 2 | Rebuild the wizard as a data-driven step registry (steps addressable individually, resumable, re-enterable) | HIGH |
| 3 | Field-level required validation gating "Next" | HIGH |
| 4 | Contextual help component (`HelpLink` → doc content) wired to every non-obvious field | HIGH |
| 5 | Settings entry: "Reconfigure setup" (reopen full wizard) and "Edit this step" (single-step edit, no restart) | MEDIUM |
| 6 | Documentation content: one comprehensive page per field/topic, written for zero-knowledge readers, with screenshots | HIGH (content work, not code) |
| 7 | Publish docs to arranto.com → Support → Fatoora Lite Pro section | MEDIUM (depends on arranto.com being ready to receive it) |
| 8 | AI-assistant hooks in wizard + docs (dormant, feature-flagged) | LOW for now — architecture only |
| 9 | Finish the existing ZATCA onboarding pipeline (single `/activate` endpoint, live sandbox round-trip) | MEDIUM — orthogonal to the wizard rebuild, folds in as the wizard's "ZATCA connection" step once ready |

Items 1–4 are the actual "immediate pain point" fix. 5 is what makes the setup
feel forgiving instead of a one-shot gate. 6–7 are the support-content
operation, largely non-engineering. 8 is deliberately deferred. 9 is the
in-flight technical work from the previous session — keep it moving in
parallel, it isn't blocked by the wizard rebuild.

---

## 4. Proposed step shape for the rebuilt wizard (design direction, not final)

A wider first step is unavoidable given the "collect everything ZATCA needs"
requirement — the brief explicitly says don't minimize forms. Suggested
grouping so it doesn't feel like one wall of fields:

1. **Business identity** — legal name (EN/AR), business category (dropdown +
   Other), CR number, CR issue date/place, CR type.
2. **Tax registration** — VAT number, VAT registration date, primary economic
   activity.
3. **Address & contact** — national address components (building number,
   street, district, city, postal code, additional number), contact person,
   phone, email.
4. **ZATCA connection** — existing CSID flow (CCSID → compliance checks →
   PCSID), once the pipeline in §9 above is finished; OTP input + live
   per-step progress.
5. **Branches/locations** — existing step, kept.
6. **Finish** — summary + what happens next.

Every field in steps 1–3 gets a `HelpLink`. Each step is independently
addressable from Settings after completion (item 5 above).

---

## 5. Explicit non-goals for this initiative

Do not touch while executing this roadmap unless a task specifically requires
it: the ZATCA crypto engine, invoicing pipeline, Compliance Center, AI RAG/agent
internals, Users & Roles, notifications. Those are done, tested, and out of
scope — this initiative is the onboarding/setup experience and the project
housekeeping around it.

---

## 6. Relationship to other docs

- [00–10](./README.md) — the technical build that's already shipped. Still the
  source of truth for how the existing modules behave.
- [11-onboarding-pipeline-handoff.md](./11-onboarding-pipeline-handoff.md) — the
  in-flight ZATCA gateway orchestration work (§9 above). Continue from there for
  that specific task.
- **This document** — the new direction: the onboarding *experience*, project
  naming/organization, and documentation strategy.
- [`/handoff.md`](../handoff.md) (repo root) — the session-to-session checklist.
  Check it first, before this document, to see what's already done.

---

## 7. Immediate organizational work (this session)

Per the brief, no feature implementation was started yet. What was done instead:

- Renamed the product from **FatooraLite** to **Fatoora Lite Pro** across docs,
  README/CHANGELOG/LICENSE/CONTRIBUTING/SECURITY, the docs portal, PWA manifest,
  page titles, AI system prompt, PDF metadata, and UI copy (EN + AR). The
  ZATCA CSR `commonName` identifier became `FatooraLite-Pro-EGS` (kept
  hyphenated/no-space since it's a technical X.509 field, not display text).
  `tsc --noEmit` clean, 89/89 unit tests still pass after the rename.
- Moved `CONTRIBUTING.md` and `SECURITY.md` into `.github/` (GitHub recognizes
  both there) to keep root to essentials (`README`, `LICENSE`, `CHANGELOG`) —
  the rest of the reorg (dedicated `docs/`, gitignored `archive/` for legacy
  material and local secrets) had already happened in an earlier session.
- Wrote this master roadmap and the root `handoff.md` tracker.
