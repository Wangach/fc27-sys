import { Router } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { writeAudit } from '../utils/audit.js';

const router = Router();
const loginSchema = z.object({ username: z.string().min(2).max(80), password: z.string().min(8).max(200) });

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    customerProfile: user.customerProfile || null,
  };
}

router.post('/login', async (req, res) => {
  const { username, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { username }, include: { customerProfile: true } });
  if (!user || user.status !== 'ACTIVE' || !(await argon2.verify(user.passwordHash, password))) {
    return res.status(401).json({ message: 'Invalid username or password.' });
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
  const cookieName = process.env.COOKIE_NAME || 'fc27_session';
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
  req.user = user;
  await writeAudit(prisma, req, 'LOGIN', 'User', user.id, { role: user.role });
  res.json({ user: publicUser(user) });
});

router.post('/logout', authenticate, async (req, res) => {
  await writeAudit(prisma, req, 'LOGOUT', 'User', req.user.id);
  res.clearCookie(process.env.COOKIE_NAME || 'fc27_session', { path: '/' });
  res.status(204).end();
});

router.get('/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

router.post('/change-password', authenticate, async (req, res) => {
  const data = z.object({ currentPassword: z.string().min(8), newPassword: z.string().min(10).max(200) }).parse(req.body);
  if (!(await argon2.verify(req.user.passwordHash, data.currentPassword))) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }
  const passwordHash = await argon2.hash(data.newPassword, { type: argon2.argon2id });
  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
  await writeAudit(prisma, req, 'PASSWORD_CHANGED', 'User', req.user.id);
  res.json({ message: 'Password changed successfully.' });
});

export default router;
