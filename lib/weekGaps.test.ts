import { describe, it, expect } from 'vitest'
import { countDaysWithoutDinner } from './weekGaps'

describe('countDaysWithoutDinner', () => {
  it('counts days with no protein, carb or vegetable', () => {
    expect(
      countDaysWithoutDinner([
        { proteinRecipeId: 'a' },
        { proteinRecipeId: '', carbRecipeId: null, vegetableRecipeId: null },
        { vegetableRecipeId: 'v' },
        {},
      ])
    ).toBe(2)
  })

  it('does not count lunch as dinner', () => {
    expect(countDaysWithoutDinner([{ lunchRecipeId: 'soup' } as never])).toBe(1)
  })

  it('is zero for a full week and for no days', () => {
    expect(countDaysWithoutDinner([{ carbRecipeId: 'c' }])).toBe(0)
    expect(countDaysWithoutDinner([])).toBe(0)
  })
})
