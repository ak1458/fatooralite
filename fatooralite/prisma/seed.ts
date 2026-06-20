import { PrismaClient } from "@prisma/client";
import { generateKeyPair, generateCsr, generateSignedInvoice } from "../lib/zatca/index";
import { hashPassword } from "../lib/auth/password";
import type { InvoiceInput } from "../lib/zatca/types";

const prisma = new PrismaClient();

async function main() {
  // Fresh start for repeatable seeds.
  await prisma.auditEntry.deleteMany();
  await prisma.clearanceRecord.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const company = await prisma.company.create({
    data: {
      name: "Almarai Company",
      nameAr: "شركة المراعي",
      vatNumber: "311122334400003",
      crNumber: "1010000001",
      address: "Riyadh, Saudi Arabia",
      branches: { create: [{ name: "Riyadh HQ", nameAr: "المقر الرئيسي", city: "Riyadh" }] },
    },
    include: { branches: true },
  });

  const kp = generateKeyPair();
  const csr = generateCsr(kp.privateKeyPem, kp.publicKeyPem, {
    commonName: "FatooraLite-EGS",
    organizationName: company.name,
    organizationalUnit: "Riyadh HQ",
  });
  await prisma.certificate.create({
    data: {
      companyId: company.id,
      kind: "production",
      csrPem: csr,
      privateKey: kp.privateKeyPem,
      certificate: kp.publicKeyPem,
      status: "active",
      issuedAt: new Date("2025-12-19"),
      expiresAt: new Date("2026-12-19"),
      serial: "4F:A2:9C:E1:00:7B",
    },
  });

  const owner = await prisma.user.create({
    data: {
      companyId: company.id,
      email: "khalid@almarai.example",
      name: "Khalid Al-Otaibi",
      role: "owner",
      passwordHash: hashPassword("owner1234"),
    },
  });
  await prisma.user.createMany({
    data: [
      {
        companyId: company.id,
        email: "accountant@almarai.example",
        name: "Sara Al-Harbi",
        role: "accountant",
        passwordHash: hashPassword("account1234"),
      },
      {
        companyId: company.id,
        email: "auditor@almarai.example",
        name: "Faisal Al-Qahtani",
        role: "auditor",
        passwordHash: hashPassword("auditor1234"),
      },
    ],
  });

  const samples: InvoiceInput[] = [
    {
      invoiceNumber: "INV-2026-04417",
      kind: "standard",
      issueDate: "2026-06-16",
      issueTime: "09:42:18",
      seller: { name: company.name, vatNumber: company.vatNumber },
      buyer: { name: "Tamimi Markets", vatNumber: "300000000000003" },
      lines: [{ description: "Fresh milk carton", quantity: 100, unitPrice: 12 }],
    },
    {
      invoiceNumber: "INV-2026-04415",
      kind: "simplified",
      issueDate: "2026-06-16",
      issueTime: "09:40:30",
      seller: { name: company.name, vatNumber: company.vatNumber },
      lines: [{ description: "Laban bottle", quantity: 20, unitPrice: 8.5 }],
    },
  ];

  for (const input of samples) {
    const signed = generateSignedInvoice(input, kp);
    await prisma.invoice.create({
      data: {
        companyId: company.id,
        branchId: company.branches[0].id,
        invoiceNumber: input.invoiceNumber,
        uuid: signed.uuid,
        kind: input.kind,
        status: "cleared",
        issueDate: input.issueDate,
        issueTime: input.issueTime ?? "00:00:00",
        buyerName: input.buyer?.name,
        buyerVat: input.buyer?.vatNumber,
        taxableAmount: signed.totals.taxableAmount,
        vatAmount: signed.totals.vatAmount,
        grandTotal: signed.totals.grandTotal,
        xml: signed.xml,
        signedXml: signed.xml,
        hash: signed.hash,
        signature: signed.signature,
        qr: signed.qr,
        lines: {
          create: input.lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            vatRate: 0.15,
            netAmount: l.quantity * l.unitPrice,
            vatAmount: Math.round(l.quantity * l.unitPrice * 0.15 * 100) / 100,
          })),
        },
      },
    });
  }

  console.log(`Seeded company ${company.name}, owner ${owner.email}, ${samples.length} invoices.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
