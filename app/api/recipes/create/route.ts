/**
 * Create Recipe API Route
 *
 * POST: Create a new recipe with structured ingredients (and optional method steps)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { RecipeFormData } from '@/types'
import { createRecipeFromForm, RecipeValidationError } from '@/lib/recipeWrite'

/**
 * POST /api/recipes/create
 * Creates a new recipe. Expects RecipeFormData in the request body.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RecipeFormData

    // Basic validation - Prisma will enforce the rest
    if (!body.name || (!body.ingredients && !body.structuredIngredients?.length)) {
      return NextResponse.json(
        { error: 'Name and ingredients are required' },
        { status: 400 }
      )
    }

    const recipe = await createRecipeFromForm(prisma, body)
    return NextResponse.json(recipe, { status: 201 })
  } catch (error) {
    if (error instanceof RecipeValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error creating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    )
  }
}
