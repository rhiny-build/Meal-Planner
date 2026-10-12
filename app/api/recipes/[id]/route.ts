/**
 * Individual Recipe API Route
 *
 * Handles operations for a specific recipe:
 * - GET: Fetch a single recipe by ID
 * - PATCH: Update a recipe
 * - DELETE: Delete a recipe
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { RecipeFormData } from '@/types'
import { updateRecipeFromForm, RecipeValidationError } from '@/lib/recipeWrite'

/**
 * GET /api/recipes/[id]
 * Fetch a single recipe by its ID with structured ingredients
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: id },
      include: {
        structuredIngredients: {
          orderBy: { order: 'asc' },
        },
        steps: { orderBy: { order: 'asc' } },
      },
    })

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    return NextResponse.json(recipe)
  } catch (error) {
    console.error('Error fetching recipe:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/recipes/[id]
 * Update an existing recipe with structured ingredients
 * Expects partial RecipeFormData in the request body
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = (await request.json()) as Partial<RecipeFormData>
    const recipe = await updateRecipeFromForm(prisma, id, body)

    return NextResponse.json(recipe)
  } catch (error) {
    if (error instanceof RecipeValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error updating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/recipes/[id]
 * Delete a recipe
 * This will also remove it from any meal plans (cascade delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.recipe.delete({
      
      where: { id: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting recipe:', error)
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 }
    )
  }
}
