import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const name = process.env.SEED_ADMIN_NAME || 'System Administrator';

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash, role: Role.ADMIN },
  });

  await prisma.matchType.upsert({
    where: { code: 'LOSER_PAY' },
    update: { loserFee: 30, active: true },
    create: { code: 'LOSER_PAY', name: 'Loser Pay', loserFee: 30, perPlayerFee: 0 },
  });

  await prisma.matchType.upsert({
    where: { code: 'FAIR_PAY' },
    update: { active: true },
    create: { code: 'FAIR_PAY', name: 'Fair Pay', loserFee: 0, perPlayerFee: 0 },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'club_name' },
    update: {},
    create: { key: 'club_name', value: 'FC Arena' },
  });

  console.log(`Seed complete. Admin username: ${username}`);
  console.log(`Change the seeded admin password immediately in production.`);
  console.log(`Configured club name: ${name}`);
}

main().finally(() => prisma.$disconnect());
