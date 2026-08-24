# FatooraLite Pro — Master Product Documentation Suite

This folder is the **single source of truth** for what FatooraLite Pro is, how every feature behaves, and the technical specifications governing ZATCA Phase-2 compliance.

> 💡 **Browsable Web Portal**: Run `npm run docs:build` inside `fatooralite/` and open `docs/portal/index.html` to browse this complete documentation suite as a responsive, offline-ready HTML site with dark/light mode support.

> 🤖 **[`docs/support/`](./support/)** is the customer-support-facing subset — plain-language
> feature docs, the business setup guide, and the ZATCA integration guide. Point an external
> support AI agent (or a support team) at that folder alone; everything else in `docs/` is
> internal engineering/audit material not meant for customers.

---

## Master Documentation Index

| # | Document | Target Audience & Purpose |
| :---: | :--- | :--- |
| **00** | **[Executive Summary & Product Architecture](./00-tldr.md)** | Executive overview of business model, regulatory problem, customer personas, and differentiators. |
| **01** | **[Product Requirements Document (PRD)](./01-prd.md)** | Core product requirements: vision, user personas, module scope, and success metrics. |
| **02** | **[Enterprise System Architecture Reference](./02-architecture.md)** | Tech stack, multi-tenant isolation, Prisma/Neon Postgres schema, crypto subsystem, and RAG vector store architecture. |
| **03** | **[User Flows & System Navigation](./03-user-flows.md)** | Step-by-step user journeys (signup, onboarding wizard, daily invoicing, clearance, AI dock). |
| **04** | **[Functional Specification](./04-functional-spec.md)** | Comprehensive module specifications, REST API endpoint schemas, and status state machines. |
| **05** | **[Feature Documentation](./support/05-features.md)** 🤖 | Deep breakdown of each functional module (Invoices, Customers, Products, RBAC, Subscriptions). |
| **06** | **[Gap Analysis](./06-gap-analysis.md)** | Architectural evolution and historical mock inventory resolution log. |
| **07** | **[Roadmap](./07-roadmap.md)** | Phased development roadmap with acceptance criteria and delivery milestones. |
| **08** | **[Remaining Work](./08-remaining-work.md)** | Archive of completed development tasks and verification checklists. |
| **09** | **[Deployment & Disaster Recovery Guide](./09-deployment.md)** | Step-by-step production deployment guide, environment secrets, and Neon PITR backup/restore drills. |
| **10** | **[AI Layer & RAG Architecture](./10-ai-architecture.md)** | OpenRouter streaming integration, `pgvector` RAG search, system prompts, and tool calling. |
| **11** | **[Onboarding Pipeline Handoff](./11-onboarding-pipeline-handoff.md)** | Automated ZATCA CSID issuance pipeline (CCSID → compliance checks → PCSID). |
| **12** | **[Master Roadmap](./12-master-roadmap.md)** | Strategic vision, future feature backlogs, and priority items. |
| **13** | **[Production Readiness Report](./13-production-readiness-report.md)** | 18-category production readiness audit report with detailed bug fix verification. |
| **14** | **[Business Administration & Operations Manual](./support/14-easy-business-setup-guide.md)** 🤖 | **Non-Developer & Business Manual**: Step-by-step 5-minute setup guide, National Address rules, ZATCA OTP guide, RBAC, and AI commands. |
| **15** | **[ZATCA Phase-2 Technical & Integration Guide](./support/15-zatca-e-invoicing-integration-guide.md)** 🤖 | **Technical Compliance Spec**: UBL 2.1 XML schema, ECDSA secp256k1 keys, XAdES C14N-11, TLV QR code, and REST API clearance. |
| **16** | **[Launch Plan](./16-launch-plan.md)** | Sequenced pre-launch phases: codebase organization, trial/Pro licensing, AI depth, product and security audits, deployment, tenant provisioning. |
| **18** | **[Production Readiness & Deployment](./18-production-checklist.md)** | Owner-facing: blockers only you can clear, every environment variable, pre-deploy gates, deploy and rollback steps, and what not to claim. |

---

**Domain:** Saudi Arabia ZATCA "Fatoora" Phase-2 (Integration Phase) E-Invoicing Compliance.  
**Product Status:** Implemented and internally verified (crypto signing, RBAC, multi-tenant
isolation — see `docs/audit/2026-08-18-production-audit.md`). **NOT production-ready as of the
2026-08-18 audit** — no real ZATCA round trip has ever been performed (owner-blocked on **X1**).
Current state, what's left, and what's owner-blocked: `START-HERE.md` (repo root), not this line.

> **Docs 00–10 above are the original master suite**, last regenerated into `docs/portal/`
> 2026-08-18. Docs 11 onward, and everything under `docs/audit/`, are not part of that portal
> build (`scripts/build-docs.mjs` only covers 00–10) — read them directly as markdown.
