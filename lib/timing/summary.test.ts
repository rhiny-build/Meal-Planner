import { describe, it, expect } from 'vitest'
import { percentile, summariseTimings, type TimingRow } from './summary'

const row = (overrides: Partial<TimingRow> = {}): TimingRow => ({
  source: 'server',
  kind: 'page',
  route: '/meal-plan',
  totalMs: 100,
  dbMs: 40,
  queryCount: 3,
  coldStart: false,
  ttfbMs: null,
  ...overrides,
})

describe('percentile', () => {
  it('uses nearest rank: the median and the slowest 10% of 10 values', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    expect(percentile(values, 50)).toBe(50)
    expect(percentile(values, 90)).toBe(90)
  })

  it('does not need sorted input and does not change it', () => {
    const values = [30, 10, 20]
    expect(percentile(values, 50)).toBe(20)
    expect(values).toEqual([30, 10, 20])
  })

  it('handles one value and none', () => {
    expect(percentile([7], 90)).toBe(7)
    expect(percentile([], 50)).toBeNull()
  })
})

describe('summariseTimings', () => {
  it('groups per route and source with count, median, slowest 10% and cold starts', () => {
    const rows = [
      ...[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((totalMs, i) =>
        row({ totalMs, coldStart: i === 9, dbMs: totalMs / 2, queryCount: 4 })
      ),
      row({ route: '/recipes', totalMs: 50 }),
    ]

    const [meal, recipes] = summariseTimings(rows)

    expect(meal).toMatchObject({
      route: '/meal-plan',
      count: 10,
      medianMs: 500,
      slowestTenthMs: 900,
      medianDbMs: 250,
      medianQueries: 4,
      coldStarts: 1,
    })
    expect(recipes).toMatchObject({ route: '/recipes', count: 1, medianMs: 50 })
  })

  it('keeps server and browser rows of the same route apart, and slowest page first', () => {
    const summaries = summariseTimings([
      row({ source: 'server', totalMs: 80 }),
      row({ source: 'browser', kind: 'load', totalMs: 900, dbMs: null, queryCount: null, ttfbMs: 300 }),
    ])

    expect(summaries.map((s) => s.source)).toEqual(['browser', 'server'])
    expect(summaries[0]).toMatchObject({ medianDbMs: null, medianQueries: null, medianTtfbMs: 300 })
  })

  it('is empty for no rows', () => {
    expect(summariseTimings([])).toEqual([])
  })
})
