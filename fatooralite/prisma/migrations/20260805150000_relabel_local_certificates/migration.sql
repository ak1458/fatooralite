-- Local self-signed certificates were stored with kind = 'production'.
--
-- Every consumer that asks for an active *production* certificate — the
-- dashboard KPIs, the clearance page, the integration panel, the AI insights —
-- then reported "Production CSID: Active" and "Gateway: Connected" for a tenant
-- that had never contacted ZATCA. For a compliance product that is not a
-- cosmetic mislabel: it tells a business it is filing with the tax authority
-- when it is not.
--
-- provisionLocalCertificate() now writes kind = 'local'. This relabels the rows
-- it already created. They are identified unambiguously by the placeholder
-- secret that only that function writes, so a real ZATCA-issued production
-- CSID cannot be caught by this.
--
-- Signing is unaffected: getActiveCertificate() selects on status, not kind.
UPDATE "Certificate"
SET "kind" = 'local'
WHERE "kind" = 'production'
  AND "secret" = 'LOCAL-DEV-SECRET';
