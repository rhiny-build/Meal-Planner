/**
 * Create Recipe API Route
 *
 * POST: Create a new recipe
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { RecipeFormData } from '@/types'

/**
 * POST /api/recipes/create
 * Creates a new recipe
 * Expects RecipeFormData in the request body
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RecipeFormData

    // Basic validation - Prisma will enforce the rest
    if (!body.name || !body.ingredients) {
      return NextResponse.json(
        { error: 'Name and ingredients are required' },
        { status: 400 }
      )
    }

    // Create the recipe in the database
    const recipe = await prisma.recipe.create({
      data: {
        name: body.name,
        recipeUrl: body.recipeUrl || null,
        ingredients: body.ingredients,
        proteinType: body.proteinType || null,
        carbType: body.carbType || null,
        prepTime: body.prepTime || null,
        tier: body.tier || 'regular',
      },
    })

    return NextResponse.json(recipe, { status: 201 })
  } catch (error) {
    console.error('Error creating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    )
  }
}
