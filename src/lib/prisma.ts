// src/lib/prisma.ts

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
  // For Vercel deployment with Supabase
  const connectionString = process.env.DATABASE_URL;

  const pool = new Pool({
    connectionString,
    // Optimized pool config for serverless with multiple concurrent requests
    max: 10, // Increased from 1 to handle concurrent requests
    min: 0,
    idleTimeoutMillis: 10000, // Close idle connections after 10s
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: true, // Allow process to exit when idle
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
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