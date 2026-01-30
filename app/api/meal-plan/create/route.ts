/**
 * Meal Plan API Route - CREATE
 *
 * Creates/saves a weekly meal plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateMonday, getWeekBounds } from '@/lib/mealPlanHelpers'
import type { BulkMealPlanRequest } from '@/types'

/**
 * POST /api/meal-plan/create
 * Saves a weekly meal plan
 * Request body:
 * - startDate: ISO date string (must be Monday)
 * - mealPlans: Array of { dayOfWeek, proteinRecipeId?, carbRecipeId?, vegetableRecipeId? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BulkMealPlanRequest

    // Basic validation
    if (!body.startDate || !body.mealPlans) {
      return NextResponse.json(
        { error: 'startDate and mealPlans are required' },
        { status: 400 }
      )
    }

    const startDate = new Date(body.startDate)

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
      body.mealPlans.map((dayPlan, index) => {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + index)

        return prisma.mealPlan.create({
          data: {
            date,
            dayOfWeek: dayPlan.dayOfWeek,
            lunchRecipeId: dayPlan.lunchRecipeId || null,
            proteinRecipeId: dayPlan.proteinRecipeId || null,
            carbRecipeId: dayPlan.carbRecipeId || null,
            vegetableRecipeId: dayPlan.vegetableRecipeId || null,
          },
          include: {
            lunchRecipe: true,
            proteinRecipe: true,
            carbRecipe: true,
            vegetableRecipe: true,
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
