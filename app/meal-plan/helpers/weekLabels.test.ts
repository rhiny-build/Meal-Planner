import { describe, it, expect } from 'vitest'
import { formatWeekRange, getWeekTitle } from './weekLabels'

describe('formatWeekRange', () => {
  it('shows one month name when the week stays in a month', () => {
    expect(formatWeekRange(new Date(2026, 9, 12))).toBe('12–18 October')
  })

  it('shows both months when the week crosses a month end', () => {
    expect(formatWeekRange(new Date(2026, 9, 26))).toBe('26 October – 1 November')
  })
})

describe('getWeekTitle', () => {
  const current = new Date(2026, 9, 12)

  it('names the current, next and previous week', () => {
    expect(getWeekTitle(new Date(2026, 9, 12), current)).toBe('This week')
    expect(getWeekTitle(new Date(2026, 9, 19), current)).toBe('Next week')
    expect(getWeekTitle(new Date(2026, 9, 5), current)).toBe('Last week')
  })

  it('names any other week by its start date', () => {
    expect(getWeekTitle(new Date(2026, 10, 2), current)).toBe('Week of 2 Nov')
  })
})
