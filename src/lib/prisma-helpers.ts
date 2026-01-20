// src/lib/prisma-helpers.ts
/**
 * Helper functions for Prisma operations
 * All Prisma models require `id` and `updatedAt` fields to be provided manually
 */

import { randomUUID } from 'crypto';

/**
 * Adds required fields (id, updatedAt) to Prisma create data
 */
export function withRequiredFields<T extends Record<string, any>>(data: T): T & { id: string; updatedAt: Date } {
  return {
    ...data,
    id: randomUUID(),
    updatedAt: new Date(),
  };
}

/**
 * Generates a new UUID for use as an ID
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Gets the current timestamp
 */
export function now(): Date {
  return new Date();
}
