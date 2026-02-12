/**
 * Tests for meal plan pure helper functions
 */

import { describe, it, expect } from 'vitest'
import {
  swapRecipesInPlan,
  applyGeneratedPlanToWeek,
  createEmptyWeekPlan,
} from './mealPlanHelpers'
import type { WeekPlan } from '@/types'

// Minimal week plan fixture (Mon–Sun starting 2026-02-09)
function makeWeekPlan(overrides: Partial<WeekPlan>[] = []): WeekPlan[] {
  const start = new Date('2026-02-09')
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  return days.map((day, i) => {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    return {
      day,
      date,
      lunchRecipeId: '',
      proteinRecipeId: '',
      carbRecipeId: '',
      vegetableRecipeId: '',
      ...overrides[i],
    }
  })
}

describe('swapRecipesInPlan', () => {
  it('should swap protein recipes between two days', () => {
    const plan = makeWeekPlan([
      { proteinRecipeId: 'chicken' },
      { proteinRecipeId: 'beef' },
    ])

    const result = swapRecipesInPlan(plan, 'protein', 0, 1)

    expect(result[0].proteinRecipeId).toBe('beef')
    expect(result[1].proteinRecipeId).toBe('chicken')
  })

  it('should swap carb recipes without affecting other columns', () => {
    const plan = makeWeekPlan([
      { proteinRecipeId: 'chicken', carbRecipeId: 'rice' },
      { proteinRecipeId: 'beef', carbRecipeId: 'pasta' },
    ])

    const result = swapRecipesInPlan(plan, 'carb', 0, 1)

    expect(result[0].carbRecipeId).toBe('pasta')
    expect(result[1].carbRecipeId).toBe('rice')
    // Protein should be untouched
    expect(result[0].proteinRecipeId).toBe('chicken')
    expect(result[1].proteinRecipeId).toBe('beef')
  })

  it('should handle swapping with an empty slot', () => {
    const plan = makeWeekPlan([
      { vegetableRecipeId: 'salad' },
      {}, // empty
    ])

    const result = swapRecipesInPlan(plan, 'vegetable', 0, 1)

    expect(result[0].vegetableRecipeId).toBe('')
    expect(result[1].vegetableRecipeId).toBe('salad')
  })

  it('should not mutate the original plan', () => {
    const plan = makeWeekPlan([{ proteinRecipeId: 'chicken' }])
    swapRecipesInPlan(plan, 'protein', 0, 1)

    expect(plan[0].proteinRecipeId).toBe('chicken')
  })
})

describe('applyGeneratedPlanToWeek', () => {
  it('should apply modifications to matching days', () => {
    const plan = makeWeekPlan()
    const monday = plan[0].date

    const result = applyGeneratedPlanToWeek(plan, [
      { date: monday, proteinRecipeId: 'p1', carbRecipeId: 'c1', vegetableRecipeId: 'v1' },
    ])

    expect(result[0].proteinRecipeId).toBe('p1')
    expect(result[0].carbRecipeId).toBe('c1')
    expect(result[0].vegetableRecipeId).toBe('v1')
  })

  it('should leave unmodified days unchanged', () => {
    const plan = makeWeekPlan([
      { proteinRecipeId: 'existing' },
    ])

    const result = applyGeneratedPlanToWeek(plan, [
      { date: plan[1].date, proteinRecipeId: 'new', carbRecipeId: '', vegetableRecipeId: '' },
    ])

    expect(result[0].proteinRecipeId).toBe('existing')
    expect(result[1].proteinRecipeId).toBe('new')
  })

  it('should handle lunchRecipeId when provided', () => {
    const plan = makeWeekPlan()

    const result = applyGeneratedPlanToWeek(plan, [
      { date: plan[0].date, lunchRecipeId: 'lunch1', proteinRecipeId: '', carbRecipeId: '', vegetableRecipeId: '' },
    ])

    expect(result[0].lunchRecipeId).toBe('lunch1')
  })

  it('should default lunchRecipeId to empty string when not provided', () => {
    const plan = makeWeekPlan([{ lunchRecipeId: 'old-lunch' }])

    const result = applyGeneratedPlanToWeek(plan, [
      { date: plan[0].date, proteinRecipeId: 'p1', carbRecipeId: '', vegetableRecipeId: '' },
    ])

    expect(result[0].lunchRecipeId).toBe('')
  })

  it('should handle string dates from AI responses', () => {
    const plan = makeWeekPlan()

    const result = applyGeneratedPlanToWeek(plan, [
      { date: plan[2].date.toISOString(), proteinRecipeId: 'p1', carbRecipeId: 'c1', vegetableRecipeId: 'v1' },
    ])

    expect(result[2].proteinRecipeId).toBe('p1')
  })

  it('should not mutate the original plan', () => {
    const plan = makeWeekPlan()
    applyGeneratedPlanToWeek(plan, [
      { date: plan[0].date, proteinRecipeId: 'new', carbRecipeId: '', vegetableRecipeId: '' },
    ])

    expect(plan[0].proteinRecipeId).toBe('')
  })
})

describe('createEmptyWeekPlan', () => {
  it('should create a 7-day plan starting from the given date', () => {
    const start = new Date('2026-02-09')
    const result = createEmptyWeekPlan(start)

    expect(result).toHaveLength(7)
    expect(result[0].day).toBe('Monday')
    expect(result[6].day).toBe('Sunday')
  })

  it('should have consecutive dates', () => {
    const start = new Date('2026-02-09')
    const result = createEmptyWeekPlan(start)

    for (let i = 1; i < result.length; i++) {
      const diff = result[i].date.getTime() - result[i - 1].date.getTime()
      // Should be 1 day apart (86400000 ms)
      expect(diff).toBe(86400000)
    }
  })

  it('should have all recipe IDs empty', () => {
    const result = createEmptyWeekPlan(new Date('2026-02-09'))

    result.forEach(day => {
      expect(day.lunchRecipeId).toBe('')
      expect(day.proteinRecipeId).toBe('')
      expect(day.carbRecipeId).toBe('')
      expect(day.vegetableRecipeId).toBe('')
    })
  })

  it('should not mutate the input date', () => {
    const start = new Date('2026-02-09')
    const originalTime = start.getTime()
    createEmptyWeekPlan(start)

    expect(start.getTime()).toBe(originalTime)
  })
})
