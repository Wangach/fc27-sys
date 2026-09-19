import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;
export const prisma = globalForPrisma.__fc27Prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production")
  globalForPrisma.__fc27Prisma = prisma;
