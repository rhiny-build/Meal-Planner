/**
 * Meal Plan API Route - GET
 *
 * Fetches the current week's meal plan (Monday-Sunday)
 * Creates empty records for any missing days
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseStartDate, getWeekBounds } from '@/lib/mealPlanHelpers'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/**
 * GET /api/meal-plan
 * Fetches a week's meal plan, creating empty records if week doesn't exist
 * Query params:
 * - startDate (optional): ISO date string for Monday of the week
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get('startDate')

    const startDate = parseStartDate(startDateParam)
    const { startDate: weekStart, endDate: weekEnd } = getWeekBounds(startDate)

    // Check if Monday exists - if not, create the whole week
    const mondayExists = await prisma.mealPlan.findFirst({
      where: { date: weekStart },
    })

    if (!mondayExists) {
      await prisma.mealPlan.createMany({
        data: DAYS_OF_WEEK.map((day, i) => {
          const date = new Date(weekStart)
          date.setDate(weekStart.getDate() + i)
          return { date, dayOfWeek: day }
        }),
      })
    }

    const mealPlans = await prisma.mealPlan.findMany({
      where: { date: { gte: weekStart, lte: weekEnd } },
      include: { proteinRecipe: true, carbRecipe: true, vegetableRecipe: true },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json({ startDate: weekStart, mealPlans })
  } catch (error) {
    console.error('Error fetching meal plan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meal plan' },
      { status: 500 }
    )
  }
}
