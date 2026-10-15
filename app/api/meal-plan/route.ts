/**
 * Meal Plan API Route - GET
 *
 * Fetches the current week's meal plan
 * Creates empty records for any missing days
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseStartDate, getWeekBounds, getOrderedDays } from '@/lib/mealPlanHelpers'
import { getWeekStartDay } from '@/app/(modules)/settings/preferenceActions'
import { formatDateParam } from '@/lib/dateUtils'
import { getDayNotesForWeek } from '@/app/meal-plan/dayNoteActions'
import { measured } from '@/lib/timing/measure'

/**
 * GET /api/meal-plan
 * Fetches a week's meal plan, creating empty records if week doesn't exist
 * Query params:
 * - startDate (optional): ISO date string for the start of the week
 */
async function handleGET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get('startDate')

    const startDay = await getWeekStartDay()
    const startDate = parseStartDate(startDateParam, startDay)
    const { startDate: weekStart, endDate: weekEnd } = getWeekBounds(startDate)

    // Only what the callers show of each meal (Tonight, the Week page and the Next week list read ids and names)
    const recipeFields = { select: { id: true, name: true, kind: true, totalTimeMinutes: true } }
    const loadWeek = () =>
      prisma.mealPlan.findMany({
        where: { date: { gte: weekStart, lte: weekEnd } },
        include: { lunchRecipe: recipeFields, proteinRecipe: recipeFields, carbRecipe: recipeFields, vegetableRecipe: recipeFields },
        orderBy: { date: 'asc' },
      })

    // Day notes come with the week, so Tonight needs one request, not two. Fetched alongside the plan.
    const [existing, dayNotes] = await Promise.all([loadWeek(), getDayNotesForWeek(formatDateParam(weekStart))])
    let mealPlans = existing

    // A week with no rows yet gets its seven empty days
    if (mealPlans.length === 0) {
      const days = getOrderedDays(startDay)
      await prisma.mealPlan.createMany({
        data: days.map((day, i) => {
          const date = new Date(weekStart)
          date.setDate(weekStart.getDate() + i)
          return { date, dayOfWeek: day }
        }),
      })
      mealPlans = await loadWeek()
    }

    return NextResponse.json({ startDate: weekStart, mealPlans, dayNotes })
  } catch (error) {
    console.error('Error fetching meal plan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meal plan' },
      { status: 500 }
    )
  }
}

export const GET = measured('api', 'GET /api/meal-plan', handleGET)
