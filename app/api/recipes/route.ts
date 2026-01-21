/**
 * Recipes API Route
 *
 * Handles:
 * - GET: Fetch all recipes (with optional filters)
 * - POST: Create a new recipe
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { RecipeFormData, RecipeFilters } from '@/types'

/**
 * GET /api/recipes
 * Fetches all recipes, optionally filtered by tier, protein, carb, or prep time
 */
export async function GET(request: NextRequest) {
  try {
    // Extract filter parameters from URL search params
    const searchParams = request.nextUrl.searchParams
    const filters: RecipeFilters = {
      tier: (searchParams.get('tier') as any) || undefined,
      proteinType: (searchParams.get('proteinType') as any) || undefined,
      carbType: (searchParams.get('carbType') as any) || undefined,
      prepTime: (searchParams.get('prepTime') as any) || undefined,
    }

    // Build the where clause based on filters
    // Only include filters that are actually provided
    const where: any = {}
    if (filters.tier) where.tier = filters.tier
    if (filters.proteinType) where.proteinType = filters.proteinType
    if (filters.carbType) where.carbType = filters.carbType
    if (filters.prepTime) where.prepTime = filters.prepTime

    // Fetch recipes from database
    const recipes = await prisma.recipe.findMany({
      where,
      orderBy: [
        { tier: 'asc' }, // Favorites first
        { name: 'asc' }, // Then alphabetically
      ],
    })

    return NextResponse.json(recipes)
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/recipes
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
