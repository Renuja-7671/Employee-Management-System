// src/lib/prisma.ts

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
  // Use DIRECT_URL for development to avoid PgBouncer session mode limits
  // In production, DATABASE_URL should use transaction mode (pgbouncer=true&connection_limit=1)
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  // Configure connection pool with conservative limits for Supabase
  const pool = new Pool({
    connectionString,
    max: 3, // Lower limit for Supabase session mode (max 5 per project)
    min: 0, // No minimum connections to reduce idle connections
    idleTimeoutMillis: 10000, // Close idle clients after 10 seconds
    connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection cannot be established
    allowExitOnIdle: true, // Allow the pool to close when all connections are idle
  });

  // Handle pool errors
  pool.on('error', (err: Error) => {
    console.error('Unexpected error on idle Prisma pool client', err);
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