import { describe, it, expect, vi, beforeEach } from 'vitest'

const create = vi.fn()
const deleteMany = vi.fn()
vi.mock('@/lib/prisma', () => ({ prisma: { requestTiming: { create: (a: unknown) => create(a), deleteMany: (a: unknown) => deleteMany(a) } } }))

import { deleteOldTimings, saveTiming, TIMING_RETENTION_DAYS } from './saveTiming'

describe('timing records', () => {
  beforeEach(() => {
    create.mockReset()
    deleteMany.mockReset()
    vi.unstubAllEnvs()
  })

  it('deletes rows older than 30 days', async () => {
    const now = Date.UTC(2026, 9, 15)
    await deleteOldTimings(now)

    const cutoff = deleteMany.mock.calls[0][0].where.createdAt.lt as Date
    expect(TIMING_RETENTION_DAYS).toBe(30)
    expect(cutoff.getTime()).toBe(now - 30 * 24 * 60 * 60 * 1000)
  })

  it('records nothing in tests or when switched off', async () => {
    await saveTiming({ source: 'server', kind: 'page', route: '/', totalMs: 5 })
    expect(create).not.toHaveBeenCalled()
  })

  it('saves a record and never throws when the database fails', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    create.mockRejectedValueOnce(new Error('db down'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(saveTiming({ source: 'server', kind: 'page', route: '/', totalMs: 5 })).resolves.toBeUndefined()
    expect(create).toHaveBeenCalledWith({ data: { source: 'server', kind: 'page', route: '/', totalMs: 5 } })
  })

  it('tidies old rows at most once an hour', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.resetModules()
    const fresh = await import('./saveTiming')
    await fresh.saveTiming({ source: 'server', kind: 'api', route: 'a', totalMs: 1 })
    await fresh.saveTiming({ source: 'server', kind: 'api', route: 'a', totalMs: 1 })
    expect(deleteMany).toHaveBeenCalledTimes(1)
  })
})
