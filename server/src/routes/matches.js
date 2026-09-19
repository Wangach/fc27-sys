import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { makeCode } from '../utils/codes.js';
import { money } from '../utils/money.js';
import { writeAudit } from '../utils/audit.js';
import { getLoserPayCharges } from '../services/matchBilling.js';

const router = Router();
router.use(authenticate);

const matchSchema = z.object({
  matchTypeCode: z.enum(['LOSER_PAY', 'FAIR_PAY']),
  playerOneId: z.string().min(1),
  playerTwoId: z.string().min(1),
  playerOneTeam: z.string().max(100).optional(),
  playerTwoTeam: z.string().max(100).optional(),
  playerOneScore: z.coerce.number().int().min(0).max(99),
  playerTwoScore: z.coerce.number().int().min(0).max(99),
  drawResolution: z.enum(['HALF_HALF', 'SUPER_LOSER']).optional(),
  superLoserPlayerOneScore: z.coerce.number().int().min(0).max(99).optional(),
  superLoserPlayerTwoScore: z.coerce.number().int().min(0).max(99).optional(),
  playedAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

function resultPair(a, b) {
  if (a === b) return ['DRAW', 'DRAW'];
  return a > b ? ['WIN', 'LOSS'] : ['LOSS', 'WIN'];
}

router.get('/types', authorize('ADMIN', 'CO_ADMIN'), async (req, res) => {
  const matchTypes = await prisma.matchType.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });
  res.set('Cache-Control', 'no-store');
  res.json({
    matchTypes: matchTypes.map((type) => ({
      ...type,
      loserFee: Number(type.loserFee),
      perPlayerFee: Number(type.perPlayerFee),
    })),
  });
});

router.get('/', authorize('ADMIN', 'CO_ADMIN'), async (req, res) => {
  const matches = await prisma.match.findMany({
    include: {
      matchType: true,
      participants: { include: { customer: true } },
      charges: { include: { customer: true } },
      createdBy: { select: { username: true } },
    },
    orderBy: { playedAt: 'desc' },
    take: 200,
  });
  res.json({ matches });
});

router.get('/mine', authorize('CUSTOMER'), async (req, res) => {
  const customerId = req.user.customerProfile?.id;
  const matches = await prisma.matchParticipant.findMany({
    where: { customerId, match: { status: 'ACTIVE' } },
    include: {
      match: {
        include: {
          matchType: true,
          participants: { include: { customer: true } },
          charges: { include: { customer: true } },
        },
      },
    },
    orderBy: { match: { playedAt: 'desc' } },
  });
  res.json({ matches });
});

router.post('/', authorize('ADMIN', 'CO_ADMIN'), async (req, res) => {
  const data = matchSchema.parse(req.body);
  if (data.playerOneId === data.playerTwoId) {
    return res.status(400).json({ message: 'A player cannot play against themselves.' });
  }

  const matchType = await prisma.matchType.findUnique({ where: { code: data.matchTypeCode } });
  if (!matchType || !matchType.active) {
    return res.status(400).json({ message: 'Selected match type is unavailable.' });
  }

  const players = await prisma.customerProfile.findMany({
    where: { id: { in: [data.playerOneId, data.playerTwoId] }, active: true },
  });
  if (players.length !== 2) {
    return res.status(400).json({ message: 'Both players must be active customers.' });
  }

  const isDraw = data.playerOneScore === data.playerTwoScore;
  const [r1, r2] = resultPair(data.playerOneScore, data.playerTwoScore);

  if (matchType.code !== 'LOSER_PAY' && data.drawResolution) {
    return res.status(400).json({ message: 'Draw payment resolution is only used for loser-pay matches.' });
  }
  if (matchType.code === 'LOSER_PAY' && !isDraw && data.drawResolution) {
    return res.status(400).json({ message: 'Draw payment resolution cannot be used when the match has a winner.' });
  }

  let loserPayCharges = [];
  if (matchType.code === 'LOSER_PAY') {
    try {
      loserPayCharges = getLoserPayCharges({
        ...data,
        loserFee: matchType.loserFee,
      });
    } catch (error) {
      return res.status(422).json({
        message: error.message,
        code: error.code || 'MATCH_BILLING_VALIDATION_FAILED',
      });
    }
  }

  const match = await prisma.$transaction(async (tx) => {
    const created = await tx.match.create({
      data: {
        matchCode: makeCode('MAT'),
        matchTypeId: matchType.id,
        playedAt: data.playedAt ? new Date(data.playedAt) : new Date(),
        createdById: req.user.id,
        notes: data.notes || null,
        drawResolution: matchType.code === 'LOSER_PAY' && isDraw ? data.drawResolution : null,
        superLoserPlayerOneScore:
          matchType.code === 'LOSER_PAY' && isDraw && data.drawResolution === 'SUPER_LOSER'
            ? data.superLoserPlayerOneScore
            : null,
        superLoserPlayerTwoScore:
          matchType.code === 'LOSER_PAY' && isDraw && data.drawResolution === 'SUPER_LOSER'
            ? data.superLoserPlayerTwoScore
            : null,
        participants: {
          create: [
            {
              customerId: data.playerOneId,
              team: data.playerOneTeam || null,
              score: data.playerOneScore,
              result: r1,
            },
            {
              customerId: data.playerTwoId,
              team: data.playerTwoTeam || null,
              score: data.playerTwoScore,
              result: r2,
            },
          ],
        },
      },
      include: { participants: true, matchType: true },
    });

    if (loserPayCharges.length) {
      await tx.gameCharge.createMany({
        data: loserPayCharges.map((charge) => ({
          customerId: charge.customerId,
          matchId: created.id,
          amount: charge.amount,
        })),
      });
    }

    if (matchType.code === 'FAIR_PAY' && money(matchType.perPlayerFee) > 0) {
      await tx.gameCharge.createMany({
        data: [
          { customerId: data.playerOneId, matchId: created.id, amount: matchType.perPlayerFee },
          { customerId: data.playerTwoId, matchId: created.id, amount: matchType.perPlayerFee },
        ],
      });
    }

    await writeAudit(tx, req, 'MATCH_RECORDED', 'Match', created.id, {
      matchCode: created.matchCode,
      type: matchType.code,
      originalScore: `${data.playerOneScore}-${data.playerTwoScore}`,
      drawResolution: isDraw ? data.drawResolution || null : null,
      superLoserScore:
        isDraw && data.drawResolution === 'SUPER_LOSER'
          ? `${data.superLoserPlayerOneScore}-${data.superLoserPlayerTwoScore}`
          : null,
      charges: loserPayCharges,
    });

    return created;
  });

  res.status(201).json({ match });
});

router.post('/:id/cancel', authorize('ADMIN'), async (req, res) => {
  const match = await prisma.match.findUnique({ where: { id: req.params.id } });
  if (!match) return res.status(404).json({ message: 'Match not found.' });
  if (match.status === 'CANCELLED') return res.json({ message: 'Match is already cancelled.' });

  await prisma.$transaction(async (tx) => {
    await tx.match.update({ where: { id: match.id }, data: { status: 'CANCELLED' } });
    await tx.gameCharge.updateMany({ where: { matchId: match.id, voidedAt: null }, data: { voidedAt: new Date() } });
    await writeAudit(tx, req, 'MATCH_CANCELLED', 'Match', match.id, { matchCode: match.matchCode });
  });

  res.json({ message: 'Match cancelled and its active game charges were voided.' });
});

export default router;
