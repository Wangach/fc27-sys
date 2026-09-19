import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const querySchema = z.object({
  q: z.string().trim().max(80).optional().default(''),
  country: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(5000).optional().default(5000),
});

router.get('/', authorize('ADMIN', 'CO_ADMIN', 'CUSTOMER'), async (req, res) => {
  const query = querySchema.parse(req.query);

  const footballTeams = await prisma.footballTeam.findMany({
    where: {
      active: true,
      ...(query.q
        ? { name: { contains: query.q, mode: 'insensitive' } }
        : {}),
      ...(query.country
        ? { country: { equals: query.country, mode: 'insensitive' } }
        : {}),
    },
    select: { id: true, name: true, country: true },
    orderBy: [{ name: 'asc' }, { country: 'asc' }],
    take: query.limit,
  });

  res.json({ footballTeams });
});

export default router;
