import { describe, expect, it } from 'vitest'
import type { ReportEntry } from '@/lib/agents/recipeBackfill/types'
import { formatCostUsd, isTickable, isTickedByDefault, listRowsToApply } from './backfillSelection'

const entry = (recipeId: string, action: ReportEntry['action']): ReportEntry => ({
  recipeId,
  name: recipeId,
  action,
  reason: '',
  summary: '',
})

describe('default ticks', () => {
  it('ticks enrich and quick, but not duplicate merges or leave rows', () => {
    expect(isTickedByDefault(entry('a', 'enrich'))).toBe(true)
    expect(isTickedByDefault(entry('a', 'quick'))).toBe(true)
    expect(isTickedByDefault(entry('a', 'duplicate'))).toBe(false)
    expect(isTickedByDefault(entry('a', 'leave'))).toBe(false)
  })

  it('gives leave rows no tick box', () => {
    expect(isTickable(entry('a', 'leave'))).toBe(false)
    expect(isTickable(entry('a', 'duplicate'))).toBe(true)
  })
})

describe('listRowsToApply', () => {
  const entries = [entry('a', 'enrich'), entry('b', 'duplicate'), entry('c', 'quick'), entry('d', 'leave')]

  it('returns only ticked rows', () => {
    expect(listRowsToApply(entries, { a: true, b: false, c: true }, {}).map((e) => e.recipeId)).toEqual(['a', 'c'])
  })

  it('needs an explicit tick for a merge', () => {
    expect(listRowsToApply(entries, { b: true }, {}).map((e) => e.recipeId)).toEqual(['b'])
  })

  it('skips rows already applied or already in place, but retries failed and skipped ones', () => {
    const applied = {
      a: { status: 'applied' as const, detail: '' },
      c: { status: 'nothing-to-do' as const, detail: '' },
      b: { status: 'failed' as const, detail: '' },
    }
    expect(listRowsToApply(entries, { a: true, b: true, c: true }, applied).map((e) => e.recipeId)).toEqual(['b'])
  })

  it('never returns a leave row even if it is ticked', () => {
    expect(listRowsToApply(entries, { d: true }, {})).toEqual([])
  })
})

describe('formatCostUsd', () => {
  it('shows four decimals for tiny amounts and two for larger ones', () => {
    expect(formatCostUsd(0.0025)).toBe('$0.0025')
    expect(formatCostUsd(0.134)).toBe('$0.13')
  })
})
