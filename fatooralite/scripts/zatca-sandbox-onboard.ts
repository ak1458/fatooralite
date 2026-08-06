/**
 * End-to-end ZATCA sandbox onboarding against the real developer portal.
 *
 *   npx tsx scripts/zatca-sandbox-onboard.ts [otp]
 *
 * Runs the three real gateway steps — compliance CSID, the four compliance
 * checks, production CSID — and reports exactly where it stops. Nothing is
 * written to the database; this exists to answer one question that unit tests
 * structurally cannot: does a signature this engine produces verify at ZATCA?
 *
 * The developer portal historically accepts a fixed OTP (123345). If it does
 * not, the run stops at step 1 and prints the gateway's own message, which is
 * the answer to "do we need a real Fatoora portal OTP or not".
 */
import { generateKeyPair, generateCsr } from "@/lib/zatca/index";
import { requestComplianceCsid, submitComplianceInvoice, requestProductionCsid } from "@/lib/zatca/onboarding";
import { generateSignedInvoice } from "@/lib/zatca/index";
import type { InvoiceInput } from "@/lib/zatca/types";

// Verified 2026-08-05: the gateway returns a structured {"code":"Missing-OTP"}
// when the header is absent, and a bare "Invalid Request" for every fixed value
// tried (123345, 111111, 999999). The OTP is validated against a live Fatoora
// portal session — there is no static developer OTP. Pass a fresh one:
//   npx tsx scripts/zatca-sandbox-onboard.ts <otp>
const OTP = process.argv[2] ?? process.env.ZATCA_OTP ?? "";

if (!OTP) {
  console.error(
    [
      "",
      "No OTP supplied.",
      "",
      "Generate one in the ZATCA Fatoora portal (Onboard new solution), then:",
      "  npx tsx scripts/zatca-sandbox-onboard.ts <otp>",
      "",
      "OTPs are short-lived — use it within the hour.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const VAT = "310122393500003";

function line(label: string, value: unknown) {
  console.log(`  ${label.padEnd(22)} ${typeof value === "string" ? value : JSON.stringify(value)}`);
}

async function main() {
  console.log(`\nZATCA sandbox onboarding — OTP ${OTP}\n${"─".repeat(60)}`);

  // ---- Step 0: key pair + CSR -------------------------------------------
  const kp = generateKeyPair();
  const csrPem = generateCsr(
    kp.privateKeyPem,
    kp.publicKeyPem,
    {
      commonName: "FatooraLite-Pro-EGS",
      organizationName: "Nakheel Trading Est.",
      organizationalUnit: "Riyadh Head Office",
      serialNumber: VAT,
    },
    {
      egsSerialNumber: "1-FatooraLitePro|2-Demo|3-EGS-0001",
      vatNumber: VAT,
      invoiceType: "1100",
      location: "Riyadh",
      industryBusinessCategory: "Trading",
    },
  );
  // Same encoding the real service uses (lib/services/onboarding-service.ts).
  const csrBase64 = Buffer.from(csrPem, "utf8").toString("base64");
  console.log("Step 0 — CSR generated");
  line("csr bytes", csrPem.length);

  // ---- Step 1: compliance CSID ------------------------------------------
  console.log("\nStep 1 — POST /compliance (compliance CSID)");
  let compliance;
  try {
    compliance = await requestComplianceCsid(csrBase64, OTP, "sandbox");
    line("requestId", compliance.requestId);
    line("token", compliance.token.slice(0, 40) + "…");
    console.log("  ✓ compliance CSID issued");
  } catch (err) {
    const e = err as { message?: string; status?: number; raw?: string };
    console.log(`  ✗ FAILED status=${e.status ?? "?"}`);
    console.log(`    ${String(e.raw ?? e.message).slice(0, 400)}`);
    console.log("\nStopped at step 1. If this is an OTP rejection, a real Fatoora");
    console.log("portal OTP is required and only the account owner can generate it.");
    return;
  }

  // ---- Step 2: the four compliance documents ----------------------------
  console.log("\nStep 2 — POST /compliance/invoices (four required documents)");
  const base = (over: Partial<InvoiceInput> & { invoiceNumber: string }): InvoiceInput => ({
    kind: "standard",
    issueDate: new Date().toISOString().slice(0, 10),
    issueTime: "12:00:00",
    seller: { name: "Nakheel Trading Est.", vatNumber: VAT },
    buyer: { name: "Panda Retail Company", vatNumber: "300000000000003" },
    lines: [{ description: "Medjool dates 5kg", quantity: 2, unitPrice: 185 }],
    ...over,
  });

  const docs: [string, InvoiceInput][] = [
    ["standard invoice", base({ invoiceNumber: "CMPL-STD-001" })],
    ["simplified invoice", base({ invoiceNumber: "CMPL-SIM-001", kind: "simplified", buyer: undefined })],
    ["standard credit note", base({ invoiceNumber: "CMPL-CRN-001", documentType: "credit", billingReferenceId: "CMPL-STD-001", instructionNote: "Return" })],
    ["standard debit note", base({ invoiceNumber: "CMPL-DBN-001", documentType: "debit", billingReferenceId: "CMPL-STD-001", instructionNote: "Adjustment" })],
  ];

  let passed = 0;
  for (const [label, input] of docs) {
    try {
      const signed = generateSignedInvoice(input, kp, { certificateBase64: compliance.token });
      const res = await submitComplianceInvoice(
        { signedXmlBase64: Buffer.from(signed.xml, "utf8").toString("base64"), invoiceHash: signed.hash, uuid: signed.uuid },
        { token: compliance.token, secret: compliance.secret },
        "sandbox",
      );
      const status = (res as { clearanceStatus?: string; reportingStatus?: string; validationResults?: unknown }) ?? {};
      const ok = JSON.stringify(status).includes("PASS") || status.clearanceStatus === "CLEARED" || status.reportingStatus === "REPORTED";
      console.log(`  ${ok ? "✓" : "✗"} ${label}`);
      if (!ok) console.log(`      ${JSON.stringify(status).slice(0, 300)}`);
      if (ok) passed++;
    } catch (err) {
      const e = err as { status?: number; raw?: string; message?: string };
      console.log(`  ✗ ${label} — status=${e.status ?? "?"}`);
      console.log(`      ${String(e.raw ?? e.message).slice(0, 300)}`);
    }
  }
  line("passed", `${passed}/4`);
  if (passed < 4) {
    console.log("\nStopped: ZATCA issues a production CSID only after all four pass.");
    return;
  }

  // ---- Step 3: production CSID ------------------------------------------
  console.log("\nStep 3 — POST /production/csids");
  try {
    const prod = await requestProductionCsid(
      { token: compliance.token, secret: compliance.secret, requestId: compliance.requestId },
      "sandbox",
    );
    line("token", prod.token.slice(0, 40) + "…");
    console.log("  ✓ PRODUCTION CSID ISSUED — full onboarding succeeded");
  } catch (err) {
    const e = err as { status?: number; raw?: string; message?: string };
    console.log(`  ✗ FAILED status=${e.status ?? "?"}`);
    console.log(`      ${String(e.raw ?? e.message).slice(0, 400)}`);
  }
}

main().catch((e) => {
  console.error("\nUnexpected error:", e);
  process.exit(1);
});
