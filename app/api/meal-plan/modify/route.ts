/**
 * Meal Plan Modification API Route
 *
 * Uses AI to modify the meal plan based on natural language instructions
 * Example: "swap Tuesday for something faster"
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { modifyMealPlan } from '@/lib/ai'
import type { MealPlanModificationRequest } from '@/types'

/**
 * POST /api/meal-plan/modify
 * Modifies the meal plan using natural language
 *
 * Request body should include:
 * - instruction: string (e.g., "swap Tuesday for something faster")
 * - mealPlanIds: string[] (the IDs of the current week's meal plans)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { instruction, mealPlanIds } = body

    if (!instruction || !mealPlanIds || !Array.isArray(mealPlanIds)) {
      return NextResponse.json(
        { error: 'Missing instruction or mealPlanIds' },
        { status: 400 }
      )
    }

    // Fetch the current meal plans with recipe details
    const currentPlan = await prisma.mealPlan.findMany({
      where: {
        id: {
          in: mealPlanIds,
        },
      },
      include: {
        proteinRecipe: true,
        carbRecipe: true
      },
      orderBy: {
        date: 'asc',
      },
    })

    // Fetch all available recipes
    const availableRecipes = await prisma.recipe.findMany()

    // Use AI to determine what changes to make
    const modificationRequest: MealPlanModificationRequest = {
      instruction,
      currentPlan,
      availableRecipes,
    }

    const result = await modifyMealPlan(modificationRequest)

    // Apply the modifications to the database
    const updatedPlans = await Promise.all(
      result.modifiedPlan.map(modification => {
        // Find the meal plan for this date
        const mealPlan = currentPlan.find(
          mp => mp.date.toDateString() === modification.date.toDateString()
        )

        if (!mealPlan) {
          throw new Error(`No meal plan found for date ${modification.date}`)
        }

        // Update it with the new recipe
        return prisma.mealPlan.update({
          where: { id: mealPlan.id },
          data: { proteinRecipeId: modification.proteinRecipeId, carbRecipeId: modification.carbRecipeId },
          include: { proteinRecipe: true, carbRecipe  : true },
        })
      })
    )

    return NextResponse.json({
      explanation: result.explanation,
      updatedPlans,
    })
  } catch (error) {
    console.error('Error modifying meal plan:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to modify meal plan',
      },
      { status: 500 }
    )
  }
}
