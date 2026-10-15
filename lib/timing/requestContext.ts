/**
 * Per-request database counters
 *
 * `measured()` opens a context around one request; the Prisma hook in
 * lib/prisma.ts adds each query to it. AsyncLocalStorage keeps concurrent
 * requests apart. Outside a context (scripts, tests) queries are not counted.
 */

import { AsyncLocalStorage } from 'node:async_hooks'

export type RequestStats = { queryCount: number; dbMs: number }

const storage = new AsyncLocalStorage<RequestStats | null>()

/** True inside a measured request (a measured function called from another one is part of it). */
export const isInsideRequest = (): boolean => Boolean(storage.getStore())

export const runWithStats = <T>(stats: RequestStats, fn: () => T): T => storage.run(stats, fn)

/** Run code (the timing insert itself) outside any request, so it is never counted as the request's own query. */
export const runOutsideStats = <T>(fn: () => T): T => storage.run(null, fn)

export function recordQuery(ms: number): void {
  const stats = storage.getStore()
  if (!stats) return
  stats.queryCount += 1
  stats.dbMs += ms
}
