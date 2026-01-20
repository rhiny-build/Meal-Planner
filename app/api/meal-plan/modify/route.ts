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
 * - currentPlan: WeekPlan[] (the current week's plan from client state)
 *
 * Returns the modified plan directly - does NOT save to database.
 * Saving is done separately when user clicks Save.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { instruction, currentPlan } = body

    if (!instruction || !currentPlan || !Array.isArray(currentPlan)) {
      return NextResponse.json(
        { error: 'Missing instruction or currentPlan' },
        { status: 400 }
      )
    }

    // Fetch all available recipes
    const availableRecipes = await prisma.recipe.findMany()

    // Build the modification request
    // The AI needs to know the dates, day names, and any existing selections
    const planForAI = currentPlan.map((day: { day: string; date: string; proteinRecipeId: string; carbRecipeId: string }) => ({
      date: new Date(day.date),
      dayOfWeek: day.day,
      proteinRecipeId: day.proteinRecipeId || null,
      carbRecipeId: day.carbRecipeId || null,
      proteinRecipe: day.proteinRecipeId ? availableRecipes.find(r => r.id === day.proteinRecipeId) : null,
      carbRecipe: day.carbRecipeId ? availableRecipes.find(r => r.id === day.carbRecipeId) : null,
    }))

    const modificationRequest: MealPlanModificationRequest = {
      instruction,
      currentPlan: planForAI,
      availableRecipes,
    }

    const result = await modifyMealPlan(modificationRequest)

    // Return the modified plan directly - no database writes
    return NextResponse.json({
      explanation: result.explanation,
      modifiedPlan: result.modifiedPlan,
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
