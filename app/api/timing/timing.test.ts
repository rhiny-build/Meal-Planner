import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const saveTiming = vi.fn()
vi.mock('@/lib/timing/saveTiming', () => ({ saveTiming: (record: unknown) => saveTiming(record) }))

import { POST } from './route'

const post = (body: unknown) =>
  POST(new NextRequest('http://localhost:3000/api/timing', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }))

describe('POST /api/timing', () => {
  beforeEach(() => saveTiming.mockReset())

  it('saves a full page load with its first-byte time, route cleaned up', async () => {
    const response = await post({ kind: 'load', route: '/recipes/clx0abcdefghijklmnopqrstu?x=1', totalMs: 812.4, ttfbMs: 140 })

    expect(response.status).toBe(204)
    expect(saveTiming).toHaveBeenCalledWith({ source: 'browser', kind: 'load', route: '/recipes/:id', totalMs: 812, ttfbMs: 140 })
  })

  it('saves moving between pages without a first-byte time', async () => {
    await post({ kind: 'nav', route: '/meal-plan', totalMs: 90 })

    expect(saveTiming).toHaveBeenCalledWith({ source: 'browser', kind: 'nav', route: '/meal-plan', totalMs: 90, ttfbMs: undefined })
  })

  it.each([
    ['an unknown kind', { kind: 'page', route: '/', totalMs: 5 }],
    ['a negative time', { kind: 'load', route: '/', totalMs: -1 }],
    ['an absurd time', { kind: 'load', route: '/', totalMs: 99999999 }],
    ['no route', { kind: 'load', totalMs: 5 }],
    ['text instead of a number', { kind: 'load', route: '/', totalMs: 'fast' }],
  ])('ignores %s, still answering 204', async (_label, body) => {
    const response = await post(body)

    expect(response.status).toBe(204)
    expect(saveTiming).not.toHaveBeenCalled()
  })

  it('ignores a body that is not JSON', async () => {
    const response = await post('not json')

    expect(response.status).toBe(204)
    expect(saveTiming).not.toHaveBeenCalled()
  })
})
