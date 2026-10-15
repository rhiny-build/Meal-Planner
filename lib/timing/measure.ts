/**
 * measured(): time one server request
 *
 * Wraps a page, API route or server action. Records the time spent in our
 * code, how long the database took, how many queries ran, and whether this
 * was the first request of a fresh function instance (a cold start). The
 * record is saved after the response is sent (next/server `after`), so
 * recording never makes the page slower. Wrapped functions behave exactly
 * like the originals.
 */

import { after } from 'next/server'
import { isInsideRequest, runWithStats } from './requestContext'
import { isTimingEnabled, saveTiming, type TimingRecord } from './saveTiming'

let requestsHandled = 0

function queueSave(record: TimingRecord): void {
  try {
    after(() => saveTiming(record))
  } catch {
    // Not inside a request (a script): save without waiting
    void saveTiming(record)
  }
}

export function measured<Args extends unknown[], Result>(
  kind: 'page' | 'api' | 'action',
  route: string,
  fn: (...args: Args) => Promise<Result>
): (...args: Args) => Promise<Result> {
  return async (...args: Args) => {
    // Off, or already part of a measured request (a page calling a measured action): just run it
    if (!isTimingEnabled() || isInsideRequest()) return fn(...args)
    const coldStart = requestsHandled === 0
    requestsHandled += 1
    const stats = { queryCount: 0, dbMs: 0 }
    const startedAt = performance.now()
    try {
      return await runWithStats(stats, () => fn(...args))
    } finally {
      queueSave({
        source: 'server',
        kind,
        route,
        totalMs: Math.round(performance.now() - startedAt),
        dbMs: Math.round(stats.dbMs),
        queryCount: stats.queryCount,
        coldStart,
      })
    }
  }
}
