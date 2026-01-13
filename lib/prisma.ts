/**
 * Prisma Client Singleton
 *
 * This file creates a single instance of PrismaClient to be reused
 * across the application. In development, hot reloading can create
 * multiple instances if we're not careful, which causes connection issues.
 *
 * The globalThis pattern ensures we reuse the same client instance
 * during development while creating a fresh one in production.
 */

import { PrismaClient } from '@prisma/client'

// Extend the global type to include our prisma property
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Create or reuse a Prisma Client instance
 * In development, store it on globalThis to survive hot reloads
 * In production, create a new instance each time
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// In development, save the client to globalThis to reuse across hot reloads
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
