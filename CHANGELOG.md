# Changelog

All notable changes to FatooraLite are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [0.2.0] — 2026-06-20

### Added
- Real ZATCA Fatoora gateway client (sandbox/production) — clearance for
  standard invoices, reporting for simplified; local BR-KSA pre-validation.
- CSID onboarding flow (Compliance CSID → Production CSID): service, API, and an
  onboarding panel in the ZATCA Integration module.
- Installable **PWA**: web manifest, service worker, app icons, theme color.
- Deploy tooling: `docker-compose.yml` (local Postgres), Supabase + Vercel guide.

### Changed
- Database moved from SQLite to **PostgreSQL** (Supabase in production).
- Removed the offline simulation mode — the gateway client is real only.
- `AUTH_SECRET` is now required (refuses the dev default in production).

## [0.1.0] — 2026-06-17

### Added
- Foundation + full bilingual (Arabic-RTL / English), dark/light UI for six
  modules: Command Center, Invoices, ZATCA Integration, Clearance, Analytics,
  AI Assistant — plus New Invoice form, Audit Vault, and nine stubs.
- ZATCA Phase-2 compliance engine: UBL 2.1 XML, SHA-256 hash, secp256k1 ECDSA
  stamp, TLV/base64 QR, PKCS#10 CSR, PIH chaining.
- Prisma data model, repositories, seed.
- Invoice issuing service + API; clearance/reporting service + API; audit vault.
- Auth + RBAC: scrypt passwords, role→permission matrix, jose sessions, login,
  route guard.
- Vitest unit/integration suite + Playwright e2e.
