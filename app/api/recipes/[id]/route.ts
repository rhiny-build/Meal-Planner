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

/**
 * GET /api/recipes/[id]
 * Fetch a single recipe by its ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: id },
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
 * Update an existing recipe
 * Expects partial RecipeFormData in the request body
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params
    const body = (await request.json()) as Partial<RecipeFormData>

    // Update the recipe in the database
    // Only update fields that are provided
    const recipe = await prisma.recipe.update({
      where: { id: id },
      data: body,
    })

    return NextResponse.json(recipe)
  } catch (error) {
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
  { params }: { params: { id: string } }
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
