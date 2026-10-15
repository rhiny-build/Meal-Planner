/**
 * Meal plan API (GET): the week comes with its day notes in one request, recipes are trimmed to what
 * the screens show, and a week with no rows gets its seven empty days.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { testPrisma, setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './setup'
import { GET } from '@/app/api/meal-plan/route'
import { saveDayNote } from '@/app/meal-plan/dayNoteActions'

const get = async (week: string) => {
  const response = await GET(new NextRequest(`http://localhost:3000/api/meal-plan?startDate=${week}`))
  return { status: response.status, body: await response.json() }
}

describe('GET /api/meal-plan', () => {
  beforeAll(async () => { await setupTestDatabase() })
  afterAll(async () => { await teardownTestDatabase() })
  beforeEach(async () => { await clearTestDatabase() })

  it('creates the seven empty days of a new week once, not again on the next visit', async () => {
    const first = await get('2026-10-12')
    expect(first.status).toBe(200)
    expect(first.body.mealPlans).toHaveLength(7)

    await get('2026-10-12')
    expect(await testPrisma.mealPlan.count()).toBe(7)
  })

  it("returns the week's day notes with the plan", async () => {
    await saveDayNote('2026-10-13', 'football till 7')
    await saveDayNote('2026-10-20', 'next week')

    const { body } = await get('2026-10-12')

    expect(body.dayNotes).toEqual({ '2026-10-13': 'football till 7' })
  })

  it('sends each meal as id, name, kind and time only', async () => {
    const recipe = await testPrisma.recipe.create({
      data: { name: 'Sea Bass', ingredients: 'sea bass\nlemon', tier: 'favorite', proteinType: 'fish', totalTimeMinutes: 25 },
    })
    await get('2026-10-12')
    await testPrisma.mealPlan.updateMany({ where: { dayOfWeek: 'Monday' }, data: { proteinRecipeId: recipe.id } })

    const { body } = await get('2026-10-12')

    const monday = body.mealPlans.find((day: { dayOfWeek: string }) => day.dayOfWeek === 'Monday')
    expect(monday.proteinRecipeId).toBe(recipe.id)
    expect(monday.proteinRecipe).toEqual({ id: recipe.id, name: 'Sea Bass', kind: 'full', totalTimeMinutes: 25 })
  })
})
