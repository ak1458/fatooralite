-- Security hardening: session version counter for post-reset invalidation.
-- When a user resets their password, sessionVersion is incremented so any
-- outstanding JWT session cookies (which embed the old version) are rejected.
-- Existing users start at 0 (matches the JWT default in verifySessionToken).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
