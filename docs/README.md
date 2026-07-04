# FatooraLite — Product Documentation

This folder is the **single source of truth** for what FatooraLite is and how every
feature must behave. Code is written to match these documents — not the other way
around. If code and docs disagree, the docs win until a doc is deliberately revised.

> **Browsable portal:** run `npm run docs:build` inside `fatooralite/` and open
> `docs/portal/index.html` — the same documents as a styled, navigable HTML site
> (self-contained, works offline, light/dark aware).

Read in this order:

| # | Document | Purpose |
|---|----------|---------|
| 00 | [TL;DR](./00-tldr.md) | One-page overview: what, who, why, how it makes money |
| 01 | [PRD](./01-prd.md) | Product requirements: vision, personas, scope, success metrics |
| 02 | [Architecture](./02-architecture.md) | Tech stack, data model, AI/RAG + vector DB, security, deploy |
| 03 | [User Flows](./03-user-flows.md) | End-to-end journeys (signup → onboarding → daily use) |
| 04 | [Functional Spec](./04-functional-spec.md) | Exact behaviour, endpoints, and states per module |
| 05 | [Feature Docs](./05-features.md) | What each module is, why it exists, how it works |
| 06 | [Gap Analysis](./06-gap-analysis.md) | Historical current-vs-target state; full mock inventory (closed) |
| 07 | [Roadmap](./07-roadmap.md) | Phased build plan with acceptance criteria |
| 08 | [Remaining Work](./08-remaining-work.md) | The final build plan — **completed**, kept for history |
| 09 | [Deployment Guide](./09-deployment.md) | Step-by-step production deployment, start to finish |
| 10 | [AI Architecture](./10-ai-architecture.md) | Provider-agnostic AI layer, RAG/pgvector, app-wide tool calling |

**Domain:** Saudi Arabia ZATCA "Fatoora" Phase 2 (Integration Phase) e-invoicing
compliance for SMEs. The product is intended to become a commercial SaaS.

**Status:** Implemented through the production-readiness phase (2026-07-03).
Docs 00–08 defined the build; 09–10 document deploying and extending it.
