-- Follow-up to 20260805150000_relabel_local_certificates, which missed rows.
--
-- That migration matched only `secret = 'LOCAL-DEV-SECRET'`, the value written
-- by provisionLocalCertificate(). The demo seed wrote a *different* placeholder
-- pair ('PLACEHOLDER-CSID-TOKEN' / 'PLACEHOLDER-CSID-SECRET'), so the seeded
-- tenant kept kind = 'production' and its dashboard still reported
-- "Production CSID: Active" and "Gateway: Connected" — for the very account the
-- product is demonstrated from.
--
-- Matching on the token as well as the secret catches both placeholder shapes.
-- A real ZATCA CSID is a base64 X.509 certificate and cannot equal either of
-- these literals, so no genuine credential can be relabelled by this.
--
-- Signing is unaffected: getActiveCertificate() selects on status, not kind.
UPDATE "Certificate"
SET "kind" = 'local'
WHERE "kind" = 'production'
  AND (
    "secret" IN ('LOCAL-DEV-SECRET', 'PLACEHOLDER-CSID-SECRET')
    OR "token" = 'PLACEHOLDER-CSID-TOKEN'
  );
