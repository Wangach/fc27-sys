import { Router } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { makeCode } from '../utils/codes.js';
import { writeAudit } from '../utils/audit.js';

const router = Router();
router.use(authenticate);

const optionalTrimmed = (schema) => z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  schema.optional(),
);

const createSchema = z.object({
  username: z.string().trim().min(2).max(80),
  password: z.string().min(10).max(200),
  role: z.enum(['ADMIN', 'CO_ADMIN', 'CUSTOMER']),
  // These fields belong to CUSTOMER accounts only. Blank values are normalized
  // to undefined so ADMIN/CO_ADMIN creation cannot fail on hidden empty inputs.
  displayName: optionalTrimmed(z.string().trim().min(2).max(120)),
  email: optionalTrimmed(z.string().trim().email()),
  phone: optionalTrimmed(z.string().trim().max(40)),
  favoriteTeam: optionalTrimmed(z.string().trim().max(100)),
});

router.get('/', authorize('ADMIN'), async (req, res) => {
  const users = await prisma.user.findMany({
    include: { customerProfile: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ users: users.map(({ passwordHash, ...u }) => u) });
});

router.post('/', authorize('ADMIN'), async (req, res) => {
  const data = createSchema.parse(req.body);
  if (data.role === 'CUSTOMER' && !data.displayName) return res.status(400).json({ message: 'Customer display name is required.' });
  const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id });
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { username: data.username, passwordHash, role: data.role } });
    if (data.role === 'CUSTOMER') {
      await tx.customerProfile.create({
        data: {
          userId: created.id,
          customerCode: makeCode('CUS'),
          displayName: data.displayName,
          email: data.email || null,
          phone: data.phone || null,
          favoriteTeam: data.favoriteTeam || null,
        },
      });
    }
    await writeAudit(tx, req, 'USER_CREATED', 'User', created.id, { role: data.role, username: data.username });
    return tx.user.findUnique({ where: { id: created.id }, include: { customerProfile: true } });
  });
  const { passwordHash: _, ...safe } = user;
  res.status(201).json({ user: safe });
});

router.patch('/:id', authorize('ADMIN'), async (req, res) => {
  const data = z.object({
    username: z.string().min(2).max(80).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    displayName: z.string().min(2).max(120).optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    favoriteTeam: z.string().max(100).nullable().optional(),
  }).parse(req.body);

  const existing = await prisma.user.findUnique({ where: { id: req.params.id }, include: { customerProfile: true } });
  if (!existing) return res.status(404).json({ message: 'User not found.' });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: existing.id }, data: { username: data.username, status: data.status } });
    if (existing.customerProfile) {
      await tx.customerProfile.update({
        where: { id: existing.customerProfile.id },
        data: {
          displayName: data.displayName,
          email: data.email,
          phone: data.phone,
          favoriteTeam: data.favoriteTeam,
          active: data.status === 'INACTIVE' ? false : data.status === 'ACTIVE' ? true : undefined,
        },
      });
    }
    await writeAudit(tx, req, 'USER_UPDATED', 'User', existing.id, { fields: Object.keys(data) });
    return tx.user.findUnique({ where: { id: existing.id }, include: { customerProfile: true } });
  });
  const { passwordHash: _, ...safe } = updated;
  res.json({ user: safe });
});

router.post('/:id/reset-password', authorize('ADMIN'), async (req, res) => {
  const { password } = z.object({ password: z.string().min(10).max(200) }).parse(req.body);
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });
  await writeAudit(prisma, req, 'PASSWORD_RESET_BY_ADMIN', 'User', req.params.id);
  res.json({ message: 'Password reset successfully.' });
});

export default router;
