import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Recipe } from '@prisma/client'
import { alignModifiedPlan, dateKey } from './alignMealPlan'
import { applyGeneratedPlanToWeek, createEmptyWeekPlan } from '@/lib/mealPlanHelpers'
import { formatDateParam } from '@/lib/dateUtils'

vi.mock('./claude', () => ({ callForcedTool: vi.fn() }))
import { callForcedTool } from './claude'
import { modifyMealPlan } from './modifyMealPlan'

const recipe = (id: string, over: Partial<Recipe> = {}): Recipe =>
  ({
    id,
    name: id,
    prepTime: 'quick',
    tier: 'favorite',
    isLunchAppropriate: false,
    proteinType: null,
    carbType: null,
    vegetableType: null,
    ...over,
  }) as Recipe

const recipes = [
  recipe('L1', { isLunchAppropriate: true }),
  recipe('L2', { isLunchAppropriate: true }),
  recipe('P1', { proteinType: 'chicken' }),
  recipe('P2', { proteinType: 'fish' }),
  recipe('C1', { carbType: 'rice' }),
  recipe('V1', { vegetableType: 'vegetable' }),
]

const sent = [
  { date: '2026-10-12', dayOfWeek: 'Monday' },
  { date: '2026-10-13', dayOfWeek: 'Tuesday' },
]
const day = (date: string, over: Record<string, string> = {}) => ({
  date,
  lunchRecipeId: 'L1',
  proteinRecipeId: 'P1',
  carbRecipeId: 'C1',
  vegetableRecipeId: 'V1',
  ...over,
})

describe('dateKey', () => {
  it('finds the calendar date in the formats a model might echo', () => {
    expect(dateKey('2026-10-12')).toBe('2026-10-12')
    expect(dateKey('2026-10-12T00:00:00.000Z')).toBe('2026-10-12')
    expect(dateKey('Monday 2026-10-12')).toBe('2026-10-12')
    expect(dateKey('12/10/2026')).toBeNull()
    expect(dateKey(undefined)).toBeNull()
  })
})

describe('alignModifiedPlan', () => {
  it('returns one entry per day sent, dated exactly as sent', () => {
    const out = alignModifiedPlan(sent, [day('2026-10-13T00:00:00.000Z', { proteinRecipeId: 'P2' }), day('2026-10-12')], recipes)
    expect(out.map((d) => [d.date, d.dayOfWeek, d.proteinRecipeId])).toEqual([
      ['2026-10-12', 'Monday', 'P1'],
      ['2026-10-13', 'Tuesday', 'P2'],
    ])
  })

  it('trusts the order, not shifted date labels (the bug: every day landed on the day before)', () => {
    // The model's labels are one day early. Matching by label would put Tuesday's meals on Monday.
    const out = alignModifiedPlan(
      sent,
      [day('2026-10-11', { proteinRecipeId: 'P1' }), day('2026-10-12', { proteinRecipeId: 'P2' })],
      recipes
    )
    expect(out.map((d) => d.proteinRecipeId)).toEqual(['P1', 'P2'])
  })

  it('blanks ids that are not in the book or do not fit the slot', () => {
    const out = alignModifiedPlan(
      sent,
      [
        day('2026-10-12', { lunchRecipeId: 'P1', proteinRecipeId: 'Chicken Donner', carbRecipeId: 'nope', vegetableRecipeId: 'V1' }),
        day('2026-10-13'),
      ],
      recipes
    )
    expect(out[0]).toMatchObject({ lunchRecipeId: '', proteinRecipeId: '', carbRecipeId: '', vegetableRecipeId: 'V1' })
    expect(out[1]).toMatchObject({ lunchRecipeId: 'L1', proteinRecipeId: 'P1' })
  })

  it('leaves a day empty when the model skipped it (and counts differ)', () => {
    const out = alignModifiedPlan(sent, [day('2026-10-13')], recipes)
    expect(out[0]).toMatchObject({ date: '2026-10-12', lunchRecipeId: '', proteinRecipeId: '' })
    expect(out[1].proteinRecipeId).toBe('P1')
  })
})

describe('modifyMealPlan end to end with a scripted model', () => {
  beforeEach(() => vi.mocked(callForcedTool).mockReset())

  it('gives the client every day with valid ids even when the model shifts its dates', async () => {
    vi.mocked(callForcedTool).mockResolvedValue({
      explanation: 'Filled.',
      modifiedPlan: [day('2026-10-11T00:00:00.000Z'), day('2026-10-12T00:00:00.000Z', { proteinRecipeId: 'P2' })],
    })
    const result = await modifyMealPlan({
      instruction: 'fill',
      currentPlan: [
        { date: '2026-10-12', dayOfWeek: 'Monday', lunchRecipeId: null, proteinRecipeId: null, carbRecipeId: null, vegetableRecipeId: null },
        { date: '2026-10-13', dayOfWeek: 'Tuesday', lunchRecipeId: null, proteinRecipeId: null, carbRecipeId: null, vegetableRecipeId: null },
      ],
      availableRecipes: recipes,
    })
    expect(result.explanation).toBe('Filled.')
    expect(result.modifiedPlan.map((d) => [d.date, d.proteinRecipeId])).toEqual([
      ['2026-10-12', 'P1'],
      ['2026-10-13', 'P2'],
    ])
    // The prompt lists the days by the plain dates we sent, not server-local timestamps.
    const prompt = vi.mocked(callForcedTool).mock.calls[0][0].prompt
    expect(prompt).toContain('Monday (2026-10-12)')
  })
})

describe('applying the answer to the grid', () => {
  // Local calendar days (new Date(y, m, d)), as the app builds them: the result must not depend
  // on the time zone of whoever runs the test (also run with TZ=Asia/Jerusalem and TZ=America/Los_Angeles).
  const week = () => createEmptyWeekPlan(new Date(2026, 9, 12), 1)

  it('fills every day when dates are plain YYYY-MM-DD strings', () => {
    const w = week()
    const answer = w.map((d, i) => ({
      date: formatDateParam(d.date),
      lunchRecipeId: `L${i}`,
      proteinRecipeId: `P${i}`,
      carbRecipeId: `C${i}`,
      vegetableRecipeId: `V${i}`,
    }))
    const out = applyGeneratedPlanToWeek(w, answer)
    expect(out.map((d) => d.proteinRecipeId)).toEqual(['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6'])
  })

  it('never overwrites a locked (already filled) slot when keepFilled is set', () => {
    const w = week()
    w[1] = { ...w[1], proteinRecipeId: 'LOCKED' }
    const answer = w.map((d) => ({
      date: formatDateParam(d.date),
      lunchRecipeId: 'L',
      proteinRecipeId: 'P',
      carbRecipeId: 'C',
      vegetableRecipeId: 'V',
    }))
    const out = applyGeneratedPlanToWeek(w, answer, { keepFilled: true })
    expect(out[1].proteinRecipeId).toBe('LOCKED')
    expect(out[1].carbRecipeId).toBe('C')
    expect(out[0].proteinRecipeId).toBe('P')
  })
})
