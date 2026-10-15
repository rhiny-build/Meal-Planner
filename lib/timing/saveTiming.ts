/**
 * Saving timing records
 *
 * Never throws and never blocks a page: callers do not await it for the
 * response (see measure.ts), a failed insert is ignored, and old rows (over
 * 30 days) are deleted at most once an hour per function instance.
 */

import { prisma } from '@/lib/prisma'
import { runOutsideStats } from './requestContext'

export const TIMING_RETENTION_DAYS = 30
const CLEANUP_EVERY_MS = 60 * 60 * 1000

export type TimingRecord = {
  source: 'server' | 'browser'
  kind: 'page' | 'api' | 'action' | 'load' | 'nav'
  route: string
  totalMs: number
  dbMs?: number
  queryCount?: number
  coldStart?: boolean
  ttfbMs?: number
}

let lastCleanup = 0

/** Off in tests, while `next build` prerenders pages (that is not a visit), and with TIMING_ENABLED=false. */
export const isTimingEnabled = () =>
  process.env.NODE_ENV !== 'test' &&
  process.env.NEXT_PHASE !== 'phase-production-build' &&
  process.env.TIMING_ENABLED !== 'false'

export async function deleteOldTimings(now = Date.now()): Promise<void> {
  const cutoff = new Date(now - TIMING_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  await prisma.requestTiming.deleteMany({ where: { createdAt: { lt: cutoff } } })
}

export function saveTiming(record: TimingRecord): Promise<void> {
  if (!isTimingEnabled()) return Promise.resolve()
  return runOutsideStats(async () => {
    try {
      await prisma.requestTiming.create({ data: record })
      const now = Date.now()
      if (now - lastCleanup > CLEANUP_EVERY_MS) {
        lastCleanup = now
        await deleteOldTimings(now)
      }
    } catch (error) {
      console.warn('Could not save a timing record', error instanceof Error ? error.message : error)
    }
  })
}
