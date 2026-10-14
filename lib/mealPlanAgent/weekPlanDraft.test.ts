import { describe, expect, it } from 'vitest'
import type { WeekPlan } from '@/types'
import { overlayDraft, reasonsByDate, weekPlanToDays } from './weekPlanDraft'
import { emptyDay, type PlanDay } from './types'

const week = (): WeekPlan[] =>
  ['Monday', 'Tuesday'].map((day, i) => ({
    day, date: new Date(2026, 9, 19 + i), lunchRecipeId: '', proteinRecipeId: i === 0 ? 'saved' : '', carbRecipeId: '', vegetableRecipeId: '',
  }))

describe('weekPlanDraft', () => {
  const draftDays: PlanDay[] = [
    { ...emptyDay('2026-10-19', 'Monday'), protein: 'saved', carb: 'rice', locked: ['protein'] },
    { ...emptyDay('2026-10-20', 'Tuesday'), protein: 'fish', reason: 'Football till 7: done by 7:30' },
  ]

  it('shows draft days over the saved week, matching by calendar date', () => {
    const out = overlayDraft(week(), draftDays)
    expect(out[0]).toMatchObject({ proteinRecipeId: 'saved', carbRecipeId: 'rice' })
    expect(out[1]).toMatchObject({ proteinRecipeId: 'fish', carbRecipeId: '' })
  })

  it('leaves days that are not in the draft alone', () => {
    expect(overlayDraft(week(), [draftDays[1]])[0].proteinRecipeId).toBe('saved')
  })

  it('collects reasons by date, and turns the screen back into draft days', () => {
    expect(reasonsByDate(draftDays)).toEqual({ '2026-10-20': 'Football till 7: done by 7:30' })
    expect(weekPlanToDays(overlayDraft(week(), draftDays))[1]).toMatchObject({ date: '2026-10-20', protein: 'fish', carb: null })
  })
})
