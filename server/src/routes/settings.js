import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { writeAudit } from '../utils/audit.js';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

const fee = z.coerce.number().finite().min(0).max(1000000);

function serializeMatchType(type) {
  return {
    ...type,
    loserFee: Number(type.loserFee),
    perPlayerFee: Number(type.perPlayerFee),
  };
}

router.get('/', async (req, res) => {
  const [settings, matchTypes] = await Promise.all([
    prisma.systemSetting.findMany(),
    prisma.matchType.findMany({ orderBy: { name: 'asc' } }),
  ]);

  res.set('Cache-Control', 'no-store');
  res.json({
    settings: Object.fromEntries(settings.map((x) => [x.key, x.value])),
    matchTypes: matchTypes.map(serializeMatchType),
  });
});

router.patch('/match-types/:code', async (req, res) => {
  const code = z.enum(['LOSER_PAY', 'FAIR_PAY']).parse(req.params.code);

  let data;
  if (code === 'LOSER_PAY') {
    data = z
      .object({
        loserFee: fee,
        active: z.boolean().optional(),
      })
      .strict()
      .parse(req.body);
  } else {
    data = z
      .object({
        perPlayerFee: fee,
        active: z.boolean().optional(),
      })
      .strict()
      .parse(req.body);
  }

  const type = await prisma.matchType.update({
    where: { code },
    data,
  });

  await writeAudit(prisma, req, 'MATCH_TYPE_UPDATED', 'MatchType', type.id, {
    code,
    ...data,
  });

  res.json({
    message:
      code === 'FAIR_PAY'
        ? `Fair Pay fee saved at KES ${Number(type.perPlayerFee).toFixed(2)} per player.`
        : `Loser Pay fee saved at KES ${Number(type.loserFee).toFixed(2)}.`,
    matchType: serializeMatchType(type),
  });
});

router.patch('/', async (req, res) => {
  const data = z.record(z.string(), z.string().max(500)).parse(req.body);
  await prisma.$transaction(
    Object.entries(data).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    ),
  );
  await writeAudit(prisma, req, 'SYSTEM_SETTINGS_UPDATED', 'SystemSetting', null, {
    keys: Object.keys(data),
  });
  res.json({ message: 'Settings updated.' });
});

export default router;
