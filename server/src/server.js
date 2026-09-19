import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import customerRoutes from './routes/customers.js';
import matchRoutes from './routes/matches.js';
import financeRoutes from './routes/finance.js';
import invoiceRoutes from './routes/invoices.js';
import ticketRoutes from './routes/tickets.js';
import statsRoutes from './routes/stats.js';
import settingsRoutes from './routes/settings.js';
import auditRoutes from './routes/audit.js';
import footballTeamRoutes from './routes/footballTeams.js';
import { prisma } from './utils/prisma.js';
import { notFound, errorHandler } from './middleware/error.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be configured and at least 32 characters long.');
  process.exit(1);
}

const app = express();
const port = Number(process.env.PORT || 5000);
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.set('trust proxy', 1);
app.use(pinoHttp());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  const changing = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const origin = req.get('origin');
  if (changing && origin && origin !== allowedOrigin) return res.status(403).json({ message: 'Untrusted request origin.' });
  next();
});

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth/login', loginLimiter);

app.get('/api/health', async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', service: 'fc27-club-api', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/football-teams', footballTeamRoutes);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(port, () => console.log(`FC Arena API listening on http://localhost:${port}`));

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
