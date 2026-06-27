/**
 * Curated ZATCA Phase 2 (Fatoora) knowledge base. Each entry becomes an embedded
 * KnowledgeChunk (scope=global) the assistant retrieves from to ground answers.
 * Keep entries factual and self-contained.
 */
export const ZATCA_CORPUS: string[] = [
  "ZATCA Phase 2 (the Integration Phase) requires VAT-registered businesses in Saudi Arabia to integrate their e-invoicing systems with the government Fatoora platform and submit invoices electronically.",
  "A standard tax invoice (type 0100000) is used for B2B and B2G transactions. It must be CLEARED by ZATCA before it is shared with the buyer. It requires full buyer details: name, address, and VAT registration number.",
  "A simplified tax invoice (type 0200000) is used for B2C retail transactions. It must be REPORTED to ZATCA within 24 hours of issuance. Buyer details are optional.",
  "Clearance means ZATCA validates and cryptographically stamps a standard invoice in real time before it is given to the buyer. Reporting means a simplified invoice is sent to ZATCA after issuance, within 24 hours.",
  "If a simplified invoice is not reported within 24 hours of issuance it becomes non-compliant and may incur penalties. Report pending simplified invoices promptly.",
  "VAT category S is the standard rate of 15%. Category Z is zero-rated (0%). Category E is exempt (0%) and requires an exemption reason and reason code. Category O is out of scope (0%).",
  "Every invoice must carry a Previous Invoice Hash (PIH) that cryptographically chains it to the previous invoice. The first invoice in the chain uses a base64-encoded genesis hash of all zeros.",
  "The Invoice Counter Value (ICV) is a sequential counter that must increment by one for each invoice. A missing or out-of-order ICV causes rejection.",
  "Invoices are signed using ECDSA with SHA-256 on the secp256k1 curve. The signature is embedded as a XAdES-EPES enveloped signature using exclusive C14N canonicalization.",
  "The QR code on a printed or PDF invoice uses TLV (Tag-Length-Value) encoding, base64-encoded. Tags 1-5 are Phase 1 (seller name, VAT number, timestamp, invoice total, VAT total). Tags 6-9 are Phase 2 (invoice hash, ECDSA signature, public key, stamp signature) and contain raw binary bytes.",
  "To onboard, an EGS unit generates a key pair and a CSR, then exchanges the CSR plus a portal OTP for a Compliance CSID. After passing compliance checks it requests a Production CSID used to clear and report real invoices.",
  "The CSID (Cryptographic Stamp Identifier) is the certificate ZATCA issues to your device. Without an active production CSID you cannot clear or report invoices to the live gateway.",
  "ZATCA provides a sandbox/simulation environment for testing onboarding and submission, and a production environment for live invoices. Start in sandbox, then promote to production.",
  "A credit note reduces or cancels a previously issued invoice (for example a return or refund). A debit note increases the amount of a previously issued invoice. Both must reference the original invoice and include a reason.",
  "Rejection code BR-KSA-83 means the VAT category code does not match the applied tax rate. For example a line marked Exempt but carrying 15% must be corrected to category S (Standard).",
  "For a standard invoice the buyer VAT number is required and must be 15 digits that start and end with the digit 3.",
  "A seller VAT number in Saudi Arabia is 15 digits, starting and ending with 3. The middle digits encode the entity and branch.",
  "If clearance returns an invalid_pih error, the Previous Invoice Hash does not match the actual hash of the last issued invoice. Ensure invoices are issued strictly in sequence.",
  "Invoice totals: the taxable (net) amount is the sum of line nets; VAT is taxable times the rate (15% for standard); the grand total is taxable plus VAT.",
  "Exempt supplies (category E) require both an ExemptionReason text and an ExemptionReasonCode. Zero-rated supplies (category Z) are taxed at 0% but are not exempt.",
  "The signed invoice XML follows the UBL 2.1 standard with ZATCA's BR-KSA business rules and the EN 16931 European semantic data model.",
  "After issuing, keep the signed XML, the QR, and the ZATCA response as an audit trail. Auditors and ZATCA may request these artifacts.",
  "A VAT return summarises the taxable amount and VAT collected for a period (usually monthly or quarterly) and is filed with ZATCA separately from invoice clearance/reporting.",
];

export const ZATCA_CORPUS_SOURCE = "zatca-rules";
