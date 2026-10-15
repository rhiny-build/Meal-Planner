import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const saved: unknown[] = []
vi.mock('./saveTiming', () => ({
  isTimingEnabled: () => true,
  saveTiming: vi.fn(async (record: unknown) => {
    saved.push(record)
  }),
}))
// `after` runs its callback straight away here (outside a request it would throw, which measure() also handles)
vi.mock('next/server', () => ({ after: (callback: () => unknown) => void callback() }))

import { measured } from './measure'
import { recordQuery } from './requestContext'

describe('measured', () => {
  beforeEach(() => {
    saved.length = 0
    vi.resetModules()
  })
  afterEach(() => vi.restoreAllMocks())

  it('returns what the wrapped function returns and passes its arguments through', async () => {
    const wrapped = measured('api', 'GET /api/x', async (a: number, b: number) => a + b)
    expect(await wrapped(2, 3)).toBe(5)
  })

  it('records route, kind, total time, and the queries made during the call', async () => {
    const wrapped = measured('page', '/meal-plan', async () => {
      recordQuery(10)
      recordQuery(5)
      return 'ok'
    })

    await wrapped()

    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ source: 'server', kind: 'page', route: '/meal-plan', queryCount: 2, dbMs: 15 })
    expect((saved[0] as { totalMs: number }).totalMs).toBeGreaterThanOrEqual(0)
  })

  it('records a failed request too, and rethrows', async () => {
    const wrapped = measured('api', 'POST /api/x', async () => {
      throw new Error('boom')
    })

    await expect(wrapped()).rejects.toThrow('boom')
    expect(saved).toHaveLength(1)
  })

  it('counts a measured call made inside another as part of the outer request (one record)', async () => {
    const inner = measured('action', 'action inner', async () => {
      recordQuery(7)
    })
    const outer = measured('page', '/outer', async () => {
      recordQuery(3)
      await inner()
    })

    await outer()

    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ route: '/outer', queryCount: 2, dbMs: 10 })
  })

  it('keeps two requests running at the same time apart', async () => {
    const slow = measured('api', 'slow', async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      recordQuery(1)
    })
    const quick = measured('api', 'quick', async () => {
      recordQuery(1)
      recordQuery(1)
    })

    await Promise.all([slow(), quick()])

    const byRoute = Object.fromEntries((saved as { route: string; queryCount: number }[]).map((r) => [r.route, r.queryCount]))
    expect(byRoute).toEqual({ slow: 1, quick: 2 })
  })

  it('marks only the first request of an instance as a cold start', async () => {
    const { measured: fresh } = await import('./measure')
    const wrapped = fresh('api', 'x', async () => 1)
    await wrapped()
    await wrapped()
    expect((saved as { coldStart: boolean }[]).map((r) => r.coldStart)).toEqual([true, false])
  })
})
