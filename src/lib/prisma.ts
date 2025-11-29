// src/lib/prisma.ts

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
  // For Vercel deployment with Supabase
  const connectionString = process.env.DATABASE_URL;

  const pool = new Pool({
    connectionString,
    // Minimal pool config for Vercel serverless
    max: 1,
    min: 0,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 10000,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export { prisma };

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}