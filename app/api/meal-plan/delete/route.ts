/**
 * Meal Plan API Route - DELETE
 *
 * Deletes a week's meal plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateMonday, getWeekBounds } from '@/lib/mealPlanHelpers'

/**
 * DELETE /api/meal-plan/delete
 * Deletes all meal plans for a given week
 * Request body:
 * - startDate: ISO date string (must be Monday)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { startDate: startDateStr } = body

    if (!startDateStr) {
      return NextResponse.json(
        { error: 'startDate is required' },
        { status: 400 }
      )
    }

    const startDate = new Date(startDateStr)

    // Validate it's a Monday
    try {
      validateMonday(startDate)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid date' },
        { status: 400 }
      )
    }

    // Delete meal plans for this week
    const { endDate } = getWeekBounds(startDate)

    await prisma.mealPlan.deleteMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    return NextResponse.json(
      { message: 'Meal plan deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting meal plan:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete meal plan',
      },
      { status: 500 }
    )
  }
}
