# FatooraLite

Arabic and English e-invoicing software for Saudi businesses, with invoice workflows, a ZATCA integration engine, and tenant-aware application services.

[![Next.js: App Router](https://img.shields.io/badge/Next.js-App%20Router-111827?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript: Typed](https://img.shields.io/badge/TypeScript-Typed-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL: Database](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-64748B?style=flat-square)](LICENSE)

[Case study](https://arranto.com/en/work/fatoora-lite) · [Documentation](docs/README.md) · [Current state](START-HERE.md)

## Product and engineering

- Invoice creation, credit/debit notes, customer and product management.
- XML generation/signing, CSID onboarding, and clearance/reporting integration code.
- Arabic/English interface, role permissions, and tenant-scoped services.
- Prisma persistence, audit events, and a provider-based assistant layer.

![Invoice dashboard in Arabic dark mode](.github/screenshots/01-dashboard-dark-ar.png)

## Run locally

```bash
git clone https://github.com/ak1458/fatooralite.git
cd fatooralite/fatooralite
npm install
cp .env.example .env
```

Set up a development PostgreSQL database and the required secrets, then run:

```bash
npm run db:migrate
npm run dev
```

The application lives in **`fatooralite/`**. Keep that directory as the deployment root. New installations require company registration; demo seeding is optional and for development only.

## Architecture and checks

`lib/zatca` → database repositories → services → API routes → application screens.

Available checks inside `fatooralite/`: `npm run lint`, `npm test`, `npm run zatca:validate`, `npm run test:e2e`, and `npm run build`. Database tests require the separate test database and isolation convention in [START-HERE.md](START-HERE.md).

## Current limits

The checked-in handoff records an outstanding real ZATCA round trip requiring the owner's portal OTP, alongside other production gates. Local signing and integration code do not establish regulatory certification or production clearance. Read [current state](START-HERE.md) and [the production checklist](docs/18-production-checklist.md) before a live rollout.

## License

Copyright © 2026 Ashraf Kamal. Reuse is restricted by [LICENSE](LICENSE).
