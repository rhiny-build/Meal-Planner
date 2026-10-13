import { describe, expect, it } from 'vitest'
import { isReportEntry } from './entryShape'

const base = { recipeId: 'r1', name: 'Soup', reason: '', summary: '' }

describe('isReportEntry', () => {
  it('accepts quick and leave rows', () => {
    expect(isReportEntry({ ...base, action: 'quick' })).toBe(true)
    expect(isReportEntry({ ...base, action: 'leave' })).toBe(true)
  })

  it('needs changes on an enrich row and a keeper on a duplicate row', () => {
    expect(isReportEntry({ ...base, action: 'enrich' })).toBe(false)
    expect(isReportEntry({ ...base, action: 'enrich', changes: { servings: 4 } })).toBe(true)
    expect(isReportEntry({ ...base, action: 'duplicate' })).toBe(false)
    expect(isReportEntry({ ...base, action: 'duplicate', merge: { keeperId: 'k' } })).toBe(true)
  })

  it('rejects junk', () => {
    expect(isReportEntry(null)).toBe(false)
    expect(isReportEntry('x')).toBe(false)
    expect(isReportEntry({ ...base, action: 'delete-everything' })).toBe(false)
    expect(isReportEntry({ action: 'quick' })).toBe(false)
  })
})
