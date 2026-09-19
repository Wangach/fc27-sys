import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { makeCode } from '../utils/codes.js';
import { money, roundMoney } from '../utils/money.js';
import { getCustomerAccount } from '../services/accountService.js';
import { writeAudit } from '../utils/audit.js';

const router = Router();
router.use(authenticate);

async function allocatedTotal(items) {
  return items.reduce((sum, a) => sum + money(a.amount), 0);
}

router.get('/summary/:customerId', authorize('ADMIN', 'CO_ADMIN'), async (req, res) => {
  res.json({ account: await getCustomerAccount(prisma, req.params.customerId) });
});

router.get('/my-summary', authorize('CUSTOMER'), async (req, res) => {
  res.json({ account: await getCustomerAccount(prisma, req.user.customerProfile.id) });
});

router.get('/purchase-debts', authorize('ADMIN', 'CO_ADMIN'), async (req, res) => {
  const where = req.query.customerId ? { customerId: String(req.query.customerId) } : {};
  const debts = await prisma.purchaseDebt.findMany({ where, include: { customer: true, allocations: { where: { payment: { status: 'ACTIVE' } } } }, orderBy: { createdAt: 'desc' }, take: 300 });
  res.json({ debts: debts.map((d) => ({ ...d, outstanding: roundMoney(Math.max(0, money(d.amount) - d.allocations.reduce((s, a) => s + money(a.amount), 0))) })) });
});

router.get('/my-purchase-debts', authorize('CUSTOMER'), async (req, res) => {
  const debts = await prisma.purchaseDebt.findMany({ where: { customerId: req.user.customerProfile.id }, include: { allocations: { where: { payment: { status: 'ACTIVE' } } } }, orderBy: { createdAt: 'desc' } });
  res.json({ debts: debts.map((d) => ({ ...d, outstanding: roundMoney(Math.max(0, money(d.amount) - d.allocations.reduce((s, a) => s + money(a.amount), 0))) })) });
});

router.post('/purchase-debts', authorize('ADMIN', 'CO_ADMIN'), async (req, res) => {
  const data = z.object({ customerId: z.string().min(1), description: z.string().min(2).max(300), amount: z.coerce.number().positive().max(100000000) }).parse(req.body);
  const customer = await prisma.customerProfile.findUnique({ where: { id: data.customerId } });
  if (!customer || !customer.active) return res.status(400).json({ message: 'Active customer not found.' });
  const debt = await prisma.$transaction(async (tx) => {
    const created = await tx.purchaseDebt.create({ data: { debtCode: makeCode('DEBT'), customerId: data.customerId, description: data.description, amount: data.amount, createdById: req.user.id } });
    await writeAudit(tx, req, 'PURCHASE_DEBT_CREATED', 'PurchaseDebt', created.id, { debtCode: created.debtCode, amount: data.amount });
    return created;
  });
  res.status(201).json({ debt });
});

router.post('/purchase-debts/:id/cancel', authorize('ADMIN'), async (req, res) => {
  const debt = await prisma.purchaseDebt.findUnique({ where: { id: req.params.id }, include: { allocations: { where: { payment: { status: 'ACTIVE' } } } } });
  if (!debt) return res.status(404).json({ message: 'Debt not found.' });
  if (debt.allocations.length) return res.status(409).json({ message: 'A debt with active payments cannot be cancelled. Reverse/reallocate the payment first.' });
  await prisma.$transaction(async (tx) => {
    await tx.purchaseDebt.update({ where: { id: debt.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
    await writeAudit(tx, req, 'PURCHASE_DEBT_CANCELLED', 'PurchaseDebt', debt.id, { debtCode: debt.debtCode });
  });
  res.json({ message: 'Purchase debt cancelled.' });
});

router.get('/payments', authorize('ADMIN', 'CO_ADMIN'), async (req, res) => {
  const where = req.query.customerId ? { customerId: String(req.query.customerId) } : {};
  const payments = await prisma.payment.findMany({ where, include: { customer: true, receivedBy: { select: { username: true } }, allocations: true }, orderBy: { createdAt: 'desc' }, take: 300 });
  res.json({ payments });
});

router.get('/my-payments', authorize('CUSTOMER'), async (req, res) => {
  const payments = await prisma.payment.findMany({ where: { customerId: req.user.customerProfile.id }, include: { allocations: true }, orderBy: { createdAt: 'desc' } });
  res.json({ payments });
});

router.post('/payments', authorize('ADMIN', 'CO_ADMIN'), async (req, res) => {
  const data = z.object({
    customerId: z.string().min(1),
    amount: z.coerce.number().positive().max(100000000),
    purpose: z.enum(['GAME_DEBT', 'PURCHASE_DEBT', 'GENERAL_CREDIT']),
    method: z.string().min(2).max(80),
    reference: z.string().max(120).optional(),
    notes: z.string().max(500).optional(),
    targetPurchaseDebtId: z.string().optional(),
  }).parse(req.body);

  const payment = await prisma.$transaction(async (tx) => {
    let remaining = roundMoney(data.amount);
    const created = await tx.payment.create({ data: { paymentNumber: makeCode('PAY'), customerId: data.customerId, amount: data.amount, unappliedAmount: data.amount, purpose: data.purpose, method: data.method, reference: data.reference || null, notes: data.notes || null, receivedById: req.user.id } });

    if (data.purpose === 'GAME_DEBT') {
      const charges = await tx.gameCharge.findMany({ where: { customerId: data.customerId, voidedAt: null, match: { status: 'ACTIVE' } }, include: { allocations: { where: { payment: { status: 'ACTIVE' } } } }, orderBy: { createdAt: 'asc' } });
      for (const charge of charges) {
        if (remaining <= 0) break;
        const used = await allocatedTotal(charge.allocations);
        const outstanding = roundMoney(money(charge.amount) - used);
        if (outstanding <= 0) continue;
        const allocation = Math.min(remaining, outstanding);
        await tx.paymentAllocation.create({ data: { paymentId: created.id, gameChargeId: charge.id, amount: allocation } });
        remaining = roundMoney(remaining - allocation);
      }
    }

    if (data.purpose === 'PURCHASE_DEBT') {
      const debts = await tx.purchaseDebt.findMany({
        where: data.targetPurchaseDebtId
          ? { id: data.targetPurchaseDebtId, customerId: data.customerId, status: { in: ['UNPAID', 'PARTIALLY_PAID'] } }
          : { customerId: data.customerId, status: { in: ['UNPAID', 'PARTIALLY_PAID'] } },
        include: { allocations: { where: { payment: { status: 'ACTIVE' } } } },
        orderBy: { createdAt: 'asc' },
      });
      if (data.targetPurchaseDebtId && debts.length === 0) throw Object.assign(new Error('Selected purchase debt is not available for this customer.'), { status: 400, expose: true });
      for (const debt of debts) {
        if (remaining <= 0) break;
        const used = await allocatedTotal(debt.allocations);
        const outstanding = roundMoney(money(debt.amount) - used);
        if (outstanding <= 0) continue;
        const allocation = Math.min(remaining, outstanding);
        await tx.paymentAllocation.create({ data: { paymentId: created.id, purchaseDebtId: debt.id, amount: allocation } });
        remaining = roundMoney(remaining - allocation);
        const after = roundMoney(outstanding - allocation);
        await tx.purchaseDebt.update({ where: { id: debt.id }, data: { status: after <= 0 ? 'PAID' : 'PARTIALLY_PAID', paidAt: after <= 0 ? new Date() : null } });
      }
    }

    const finalPayment = await tx.payment.update({ where: { id: created.id }, data: { unappliedAmount: remaining } });
    await writeAudit(tx, req, 'PAYMENT_RECORDED', 'Payment', created.id, { paymentNumber: created.paymentNumber, amount: data.amount, purpose: data.purpose, unappliedAmount: remaining });
    return finalPayment;
  });
  res.status(201).json({ payment });
});

router.post('/payments/:id/reverse', authorize('ADMIN'), async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { allocations: true } });
  if (!payment) return res.status(404).json({ message: 'Payment not found.' });
  if (payment.status === 'REVERSED') return res.json({ message: 'Payment is already reversed.' });

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: 'REVERSED', reversedAt: new Date(), unappliedAmount: 0 } });
    const debtIds = [...new Set(payment.allocations.map((a) => a.purchaseDebtId).filter(Boolean))];
    for (const debtId of debtIds) {
      const debt = await tx.purchaseDebt.findUnique({ where: { id: debtId }, include: { allocations: { where: { payment: { status: 'ACTIVE', id: { not: payment.id } } } } } });
      if (!debt || debt.status === 'CANCELLED') continue;
      const paid = debt.allocations.reduce((s, a) => s + money(a.amount), 0);
      const outstanding = roundMoney(money(debt.amount) - paid);
      await tx.purchaseDebt.update({ where: { id: debt.id }, data: { status: outstanding <= 0 ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID', paidAt: outstanding <= 0 ? debt.paidAt || new Date() : null } });
    }
    await writeAudit(tx, req, 'PAYMENT_REVERSED', 'Payment', payment.id, { paymentNumber: payment.paymentNumber });
  });
  res.json({ message: 'Payment reversed. Debt balances have been recalculated.' });
});

export default router;
