/**
 * Meal Plan API Route
 *
 * Handles:
 * - GET: Fetch the current week's meal plan
 * - POST: Generate a new weekly meal plan
 * - PATCH: Update an existing meal plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { bulkMealPlanSchema } from '@/lib/validations'
// import { generateWeeklyMealPlan } from '@/lib/ai' // TODO: Update for protein/carb structure

/**
 * GET /api/meal-plan
 * Fetches the current week's meal plan (Monday-Sunday)
 * If no date is provided, uses the current week
 */
export async function GET(request: NextRequest) {
  try {
    // Get the start date (Monday) from query params or use current week
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get('startDate')

    // Calculate the Monday of the week
    let startDate: Date
    if (startDateParam) {
      startDate = new Date(startDateParam)
    } else {
      // Get current week's Monday
      const today = new Date()
      const dayOfWeek = today.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Adjust when day is Sunday
      startDate = new Date(today)
      startDate.setDate(today.getDate() + diff)
    }

    // Set to start of day
    startDate.setHours(0, 0, 0, 0)

    // Calculate end date (Sunday)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    endDate.setHours(23, 59, 59, 999)

    // Fetch meal plans for the week with recipe details
    const mealPlans = await prisma.mealPlan.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
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

    return NextResponse.json({ startDate, mealPlans })
  } catch (error) {
    console.error('Error fetching meal plan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meal plan' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/meal-plan
 * Saves a weekly meal plan
 * Request body should include:
 * - startDate: Date (Monday of the week)
 * - mealPlans: Array of { day, proteinRecipeId?, carbRecipeId?, vegetableRecipeId? }
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
    if (startDate.getDay() !== 1) {
      return NextResponse.json(
        { error: 'Start date must be a Monday' },
        { status: 400 }
      )
    }

    // Delete existing meal plans for this week
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    endDate.setHours(23, 59, 59, 999)

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
            dayOfWeek: dayPlan.day,
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

/**
 * PATCH /api/meal-plan
 * Updates specific meals in the plan
 * Request body should include an array of updates:
 * [{ id: string, recipeId: string }]
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const updates: Array<{ id: string; recipeId: string }> = body.updates

    // Update each meal plan
    const updatedPlans = await Promise.all(
      updates.map(update =>
        prisma.mealPlan.update({
          where: { id: update.id },
          data: { recipeId: update.recipeId },
          include: { recipe: true },
        })
      )
    )

    return NextResponse.json({ mealPlans: updatedPlans })
  } catch (error) {
    console.error('Error updating meal plan:', error)
    return NextResponse.json(
      { error: 'Failed to update meal plan' },
      { status: 500 }
    )
  }
}
