import { Router } from "express";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import { prisma } from "../utils/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { getCustomerAccount } from "../services/accountService.js";
import { makeCode } from "../utils/codes.js";
import { writeAudit } from "../utils/audit.js";


const router = Router();
router.use(authenticate);

function transactionPurposeLabel(purpose) {
  return String(purpose || "").replaceAll("_", " ");
}

async function getRecentTransactions(customerId, invoiceCreatedAt) {
  return prisma.payment.findMany({
    where: {
      customerId,
      createdAt: { lte: invoiceCreatedAt },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: {
      id: true,
      paymentNumber: true,
      amount: true,
      purpose: true,
      method: true,
      reference: true,
      status: true,
      createdAt: true,
    },
  });
}

router.get("/", authorize("ADMIN", "CO_ADMIN"), async (req, res) => {
  const where = req.query.customerId
    ? { customerId: String(req.query.customerId) }
    : {};
  const invoices = await prisma.invoice.findMany({
    where,
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ invoices });
});

router.get("/mine", authorize("CUSTOMER"), async (req, res) => {
  const invoices = await prisma.invoice.findMany({
    where: { customerId: req.user.customerProfile.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ invoices });
});

router.post(
  "/:customerId",
  authorize("ADMIN", "CO_ADMIN"),
  async (req, res) => {
    const customer = await prisma.customerProfile.findUnique({
      where: { id: req.params.customerId },
    });
    if (!customer)
      return res.status(404).json({ message: "Customer not found." });
    const account = await getCustomerAccount(prisma, customer.id);
    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          invoiceNumber: makeCode("INV"),
          customerId: customer.id,
          gameDebtTotal: account.gameDebt,
          purchaseDebtTotal: account.purchaseDebt,
          grandTotal: account.totalDebt,
          generatedById: req.user.id,
          items: {
            create: [
              ...account.gameItems
                .filter((x) => x.outstanding > 0)
                .map((x) => ({
                  category: "GAME_DEBT",
                  referenceId: x.matchId,
                  description: x.description,
                  amount: x.outstanding,
                })),
              ...account.purchaseItems
                .filter((x) => x.outstanding > 0)
                .map((x) => ({
                  category: "PURCHASE_DEBT",
                  referenceId: x.id,
                  description: `${x.debtCode} — ${x.description}`,
                  amount: x.outstanding,
                })),
            ],
          },
        },
        include: { items: true, customer: true },
      });
      await writeAudit(tx, req, "INVOICE_GENERATED", "Invoice", created.id, {
        invoiceNumber: created.invoiceNumber,
        total: account.totalDebt,
      });
      return created;
    });
    const recentTransactions = await getRecentTransactions(
      invoice.customerId,
      invoice.createdAt,
    );
    res.status(201).json({ invoice: { ...invoice, recentTransactions } });
  },
);

async function getAuthorizedInvoice(req, res) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { items: true, customer: true },
  });
  if (!invoice) {
    res.status(404).json({ message: "Invoice not found." });
    return null;
  }
  if (
    req.user.role === "CUSTOMER" &&
    invoice.customerId !== req.user.customerProfile?.id
  ) {
    res.status(403).json({ message: "You cannot access this invoice." });
    return null;
  }
  const recentTransactions = await getRecentTransactions(
    invoice.customerId,
    invoice.createdAt,
  );
  return { ...invoice, recentTransactions };
}

router.get("/:id", async (req, res) => {
  const invoice = await getAuthorizedInvoice(req, res);
  if (!invoice) return;
  res.json({ invoice });
});

router.get("/:id/pdf", async (req, res) => {
  const invoice = await getAuthorizedInvoice(req, res);
  if (!invoice) return;
  const doc = new PDFDocument({ margin: 48, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${invoice.invoiceNumber}.pdf"`,
  );
  doc.pipe(res);
  //start of inv
 const imagePath = join(process.cwd(), 'src/img', 'bs-logo.jpg');
  
  // Option 1 – simplest (recommended)
  const imageBuffer = await readFile(imagePath);
  doc.image(imageBuffer, 430, 15, {
    fit: [100, 100],
    align: 'center',
    valign: 'center'
  });
  doc.fontSize(24).text("Broad Horizons Ent.", { align: "center" });
  doc.moveDown(0.2).fontSize(13).text("ACCOUNT INVOICE", { align: "center" });
  doc.moveDown();
  doc.fontSize(10).text(`Invoice: ${invoice.invoiceNumber}`);
  doc.text(
    `Customer: ${invoice.customer.displayName} (${invoice.customer.customerCode})`,
    {fill: true, fillColor: "#2765F5"}
  );
  doc.text(`Date: ${invoice.createdAt.toISOString().slice(0, 10)}`);
  doc.moveDown();

  const gameItems = invoice.items.filter((x) => x.category === "GAME_DEBT");
  const purchaseItems = invoice.items.filter(
    (x) => x.category === "PURCHASE_DEBT",
  );
  const section = (title, items, total) => {
    doc.fontSize(13).text(title, {underline: true}).moveDown(0.3);
    if (!items.length) doc.fontSize(10).text("No outstanding items.");
    for (const item of items)
      doc
        .fontSize(10)
        .text(`${item.description}`, { continued: true })
        .text(`  KES ${Number(item.amount).toFixed(2)}`, { align: "right" });
    doc
      .moveDown(0.3)
      .fontSize(10)
      .text(`${title} TOTAL: KES ${Number(total).toFixed(2)}`, {
        align: "right",
      })
      .moveDown();
  };
  section("GAME DEBT", gameItems, invoice.gameDebtTotal);
  section("PURCHASE DEBT", purchaseItems, invoice.purchaseDebtTotal);

  doc.fontSize(13).text("RECENT TRANSACTIONS", {underline: true}).moveDown(0.3);
  if (!invoice.recentTransactions.length) {
    doc
      .fontSize(10)
      .text("No transactions recorded before this invoice was generated.");
  } else {
    for (const transaction of invoice.recentTransactions) {
      const date = transaction.createdAt.toISOString().slice(0, 10);
      const ref = transaction.reference
        ? ` | Ref: ${transaction.reference}`
        : "";
      doc
        .fontSize(10)
        .text(
          `${date} | ${transaction.paymentNumber} | ${transactionPurposeLabel(transaction.purpose)} | KES ${Number(transaction.amount).toFixed(2)}`,
        );
      doc
        .fontSize(8.5)
        .fillColor("#555555")
        .text(`${transaction.method}${ref} | ${transaction.status}`);
      doc.fillColor("#000000").moveDown(0.35);
    }
  }

  doc
    .fillColor('#D41C1C')
    .moveDown()
    .fontSize(16)
    .text(`TOTAL AMOUNT DUE: KES ${Number(invoice.grandTotal).toFixed(2)}`, {
      align: "right"
    });
  doc
    .fillColor('#09101C')
    .moveDown(2)
    .fontSize(9)
    .text(
      "This invoice is a snapshot of the outstanding account balance and recent transaction history at the time it was generated.",
      { align: "center" },
    );
  doc
  .fillColor('#1C5FD4')
  .moveDown(10)
  .fontSize(15)
  .text(
    "Thank You For Being A Broad Horizons Ent Customer. You Are Valued!",
    {align: "center"},
  );
  // const footerPath = join(process.cwd(), 'src/img', 'bs-logo-2.jpeg');
  // const imageSize = 300;
  // const bottomMargin = 30; 

  // const x = (doc.page.width - imageSize) / 2;   
  // const y = doc.page.height - imageSize - bottomMargin;  
  
  // // Option 1 – simplest (recommended)
  // const footerBuffer = await readFile(footerPath);
  // doc.image(footerBuffer, x, y, {
  //   fit: [imageSize, imageSize],
  //   align: 'center',
  //   valign: 'center'
  // });
  doc.end();
});

export default router;
