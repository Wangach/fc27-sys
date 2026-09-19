import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { writeAudit } from '../utils/audit.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize('ADMIN', 'CO_ADMIN'), async (req, res) => {
  const tickets = await prisma.ticket.findMany({ include: { customer: true, messages: { include: { sender: { select: { username: true, role: true } } }, orderBy: { createdAt: 'asc' } } }, orderBy: { updatedAt: 'desc' } });
  res.json({ tickets });
});

router.get('/mine', authorize('CUSTOMER'), async (req, res) => {
  const tickets = await prisma.ticket.findMany({ where: { customerId: req.user.customerProfile.id }, include: { messages: { include: { sender: { select: { username: true, role: true } } }, orderBy: { createdAt: 'asc' } } }, orderBy: { updatedAt: 'desc' } });
  res.json({ tickets });
});

router.post('/', authorize('CUSTOMER'), async (req, res) => {
  const data = z.object({ type: z.enum(['COMPLAINT', 'SUGGESTION']), subject: z.string().min(3).max(160), message: z.string().min(5).max(3000) }).parse(req.body);
  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.ticket.create({ data: { customerId: req.user.customerProfile.id, type: data.type, subject: data.subject, messages: { create: { senderId: req.user.id, message: data.message } } }, include: { messages: true } });
    await writeAudit(tx, req, 'TICKET_CREATED', 'Ticket', created.id, { type: data.type, subject: data.subject });
    return created;
  });
  res.status(201).json({ ticket });
});

router.post('/:id/messages', async (req, res) => {
  const { message } = z.object({ message: z.string().min(1).max(3000) }).parse(req.body);
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });
  if (req.user.role === 'CUSTOMER' && ticket.customerId !== req.user.customerProfile?.id) return res.status(403).json({ message: 'You cannot access this ticket.' });
  const entry = await prisma.ticketMessage.create({ data: { ticketId: ticket.id, senderId: req.user.id, message } });
  await writeAudit(prisma, req, 'TICKET_MESSAGE_ADDED', 'Ticket', ticket.id);
  res.status(201).json({ message: entry });
});

router.patch('/:id/status', authorize('ADMIN', 'CO_ADMIN'), async (req, res) => {
  const { status } = z.object({ status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']) }).parse(req.body);
  const ticket = await prisma.ticket.update({ where: { id: req.params.id }, data: { status } });
  await writeAudit(prisma, req, 'TICKET_STATUS_UPDATED', 'Ticket', ticket.id, { status });
  res.json({ ticket });
});

export default router;
