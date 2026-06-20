# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in FatooraLite, please report it
privately. **Do not open a public issue for security problems.**

Email: **ashrafkamal1458@gmail.com** with subject `SECURITY: FatooraLite`.

Include: a description, steps to reproduce, affected version/commit, and impact.
You will receive an acknowledgement within a few business days.

## Scope

This is a ZATCA Phase-2 e-invoicing compliance app. Areas of particular interest:

- Cryptographic stamping / key handling (`fatooralite/lib/zatca`).
- Authentication & RBAC (`fatooralite/lib/auth`, `fatooralite/proxy.ts`).
- ZATCA gateway credentials (CSID token/secret) storage.

## Handling of secrets

- No secrets are committed; `.env` is git-ignored (`.env.example` only).
- `AUTH_SECRET` must be a strong random value in production (the app refuses the
  development default when `NODE_ENV=production`).
- Certificate private keys are stored as PEM in the database; production
  deployments should add column/KMS encryption (see `doc/DEPLOY.md`).
