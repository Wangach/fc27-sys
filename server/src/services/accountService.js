import { money, roundMoney } from '../utils/money.js';

export async function getCustomerAccount(db, customerId) {
  const [gameCharges, purchaseDebts, payments] = await Promise.all([
    db.gameCharge.findMany({
      where: { customerId, voidedAt: null, match: { status: 'ACTIVE' } },
      include: { allocations: { where: { payment: { status: 'ACTIVE' } } }, match: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.purchaseDebt.findMany({
      where: { customerId, status: { not: 'CANCELLED' } },
      include: { allocations: { where: { payment: { status: 'ACTIVE' } } } },
      orderBy: { createdAt: 'asc' },
    }),
    db.payment.findMany({ where: { customerId, status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } }),
  ]);

  const gameItems = gameCharges.map((charge) => {
    const allocated = charge.allocations.reduce((s, a) => s + money(a.amount), 0);
    const description =
      charge.match.drawResolution === 'HALF_HALF'
        ? `Loser-pay draw (Half-Half) — ${charge.match.matchCode}`
        : charge.match.drawResolution === 'SUPER_LOSER'
          ? `Loser-pay draw (Super-looser) — ${charge.match.matchCode}`
          : `Game charge — ${charge.match.matchCode}`;
    return {
      id: charge.id,
      matchId: charge.matchId,
      matchCode: charge.match.matchCode,
      description,
      original: money(charge.amount),
      paid: roundMoney(allocated),
      outstanding: roundMoney(Math.max(0, money(charge.amount) - allocated)),
      createdAt: charge.createdAt,
    };
  });

  const purchaseItems = purchaseDebts.map((debt) => {
    const allocated = debt.allocations.reduce((s, a) => s + money(a.amount), 0);
    const outstanding = debt.status === 'PAID' ? 0 : Math.max(0, money(debt.amount) - allocated);
    return {
      id: debt.id,
      debtCode: debt.debtCode,
      description: debt.description,
      status: debt.status,
      original: money(debt.amount),
      paid: roundMoney(allocated),
      outstanding: roundMoney(outstanding),
      createdAt: debt.createdAt,
    };
  });

  const gameDebt = roundMoney(gameItems.reduce((s, x) => s + x.outstanding, 0));
  const purchaseDebt = roundMoney(purchaseItems.reduce((s, x) => s + x.outstanding, 0));
  const unappliedCredit = roundMoney(payments.reduce((s, p) => s + money(p.unappliedAmount), 0));

  return {
    gameDebt,
    purchaseDebt,
    totalDebt: roundMoney(gameDebt + purchaseDebt),
    unappliedCredit,
    gameItems,
    purchaseItems,
  };
}
