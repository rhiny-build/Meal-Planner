/**
 * Meal Plan API Route - GET
 *
 * Fetches the current week's meal plan (Monday-Sunday)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseStartDate, getWeekBounds } from '@/lib/mealPlanHelpers'

/**
 * GET /api/meal-plan
 * Fetches a week's meal plan
 * Query params:
 * - startDate (optional): ISO date string for Monday of the week
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get('startDate')

    const startDate = parseStartDate(startDateParam)
    const { startDate: weekStart, endDate: weekEnd } = getWeekBounds(startDate)

    // Fetch meal plans for the week with recipe details
    const mealPlans = await prisma.mealPlan.findMany({
      where: {
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        proteinRecipe: true,
        carbRecipe: true,
        vegetableRecipe: true
      },
      orderBy: {
        date: 'asc',
      },
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
