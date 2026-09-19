import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { getLeaderboard } from '../services/rankingService.js';
import { getCustomerAccount } from '../services/accountService.js';
import { getHeadToHeadComparison } from '../services/playerInsights.js';

const router = Router();
router.use(authenticate);

router.get('/leaderboard', async (req, res) => res.json({ leaderboard: await getLeaderboard(prisma) }));


router.get('/head-to-head', authorize('ADMIN'), async (req, res) => {
  const { playerOneId, playerTwoId } = req.query;
  if (!playerOneId || !playerTwoId) {
    return res.status(400).json({ message: 'Select two players to compare.' });
  }
  if (playerOneId === playerTwoId) {
    return res.status(400).json({ message: 'Choose two different players.' });
  }
  const comparison = await getHeadToHeadComparison(prisma, String(playerOneId), String(playerTwoId));
  if (!comparison) return res.status(404).json({ message: 'One or both players could not be found.' });
  res.json(comparison);
});

router.get('/admin-dashboard', authorize('ADMIN', 'CO_ADMIN'), async (req, res) => {
  const [customers, matchesToday, openTickets, recentMatches, recentPayments, debts] = await Promise.all([
    prisma.customerProfile.count({ where: { active: true } }),
    prisma.match.count({ where: { status: 'ACTIVE', playedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.match.findMany({ where: { status: 'ACTIVE' }, include: { matchType: true, participants: { include: { customer: true } } }, orderBy: { playedAt: 'desc' }, take: 6 }),
    prisma.payment.findMany({ where: { status: 'ACTIVE' }, include: { customer: true }, orderBy: { createdAt: 'desc' }, take: 6 }),
    prisma.customerProfile.findMany({ where: { active: true }, select: { id: true } }),
  ]);
  let totalDebt = 0;
  for (const c of debts) totalDebt += (await getCustomerAccount(prisma, c.id)).totalDebt;
  const leaderboard = (await getLeaderboard(prisma)).slice(0, 5);
  res.json({ customers, matchesToday, openTickets, totalDebt, recentMatches, recentPayments, leaderboard });
});

export default router;
