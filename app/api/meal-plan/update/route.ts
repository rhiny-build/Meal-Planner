/**
 * Meal Plan API Route - UPDATE
 *
 * Updates a single meal plan entry
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/meal-plan/update
 * Updates a single meal plan entry
 * Request body:
 * - id: meal plan ID to update
 * - proteinRecipeId?: new protein recipe ID (or null to clear)
 * - carbRecipeId?: new carb recipe ID (or null to clear)
 * - vegetableRecipeId?: new vegetable recipe ID (or null to clear)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Meal plan ID is required' },
        { status: 400 }
      )
    }

    // Verify the meal plan exists
    const existing = await prisma.mealPlan.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      )
    }

    // Update the meal plan
    const updated = await prisma.mealPlan.update({
      where: { id },
      data: {
        lunchRecipeId: updateData.lunchRecipeId ?? existing.lunchRecipeId,
        proteinRecipeId: updateData.proteinRecipeId ?? existing.proteinRecipeId,
        carbRecipeId: updateData.carbRecipeId ?? existing.carbRecipeId,
        vegetableRecipeId: updateData.vegetableRecipeId ?? existing.vegetableRecipeId,
      },
      include: {
        lunchRecipe: true,
        proteinRecipe: true,
        carbRecipe: true,
        vegetableRecipe: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating meal plan:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update meal plan',
      },
      { status: 500 }
    )
  }
}
