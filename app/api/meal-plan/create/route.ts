/**
 * Meal Plan API Route - CREATE
 *
 * Creates/saves a weekly meal plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { bulkMealPlanSchema } from '@/lib/validations'
import { validateMonday, getWeekBounds } from '@/lib/mealPlanHelpers'

/**
 * POST /api/meal-plan/create
 * Saves a weekly meal plan
 * Request body:
 * - startDate: ISO date string (must be Monday)
 * - mealPlans: Array of { dayOfWeek, proteinRecipeId?, carbRecipeId?, vegetableRecipeId? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate using Zod schema
    const validation = bulkMealPlanSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { startDate: startDateStr, mealPlans: mealPlansData } = validation.data
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

    // Delete existing meal plans for this week
    const { endDate } = getWeekBounds(startDate)

    await prisma.mealPlan.deleteMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    // Create new meal plans for each day
    const mealPlans = await Promise.all(
      mealPlansData.map((dayPlan, index) => {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + index)

        return prisma.mealPlan.create({
          data: {
            date,
            dayOfWeek: dayPlan.dayOfWeek,
            proteinRecipeId: dayPlan.proteinRecipeId || null,
            carbRecipeId: dayPlan.carbRecipeId || null,
            vegetableRecipeId: dayPlan.vegetableRecipeId || null,
          },
          include: {
            proteinRecipe: true,
            carbRecipe: true,
            vegetableRecipe: true
          },
        })
      })
    )

    return NextResponse.json({ mealPlans }, { status: 201 })
  } catch (error) {
    console.error('Error saving meal plan:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save meal plan',
      },
      { status: 500 }
    )
  }
}
