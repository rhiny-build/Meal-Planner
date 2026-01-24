/**
 * Recipes API Route
 *
 * GET: Fetch all recipes (with optional filters)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { RecipeFilters } from '@/types'

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

    // Fetch recipes from database with structured ingredients
    const recipes = await prisma.recipe.findMany({
      where,
      include: {
        structuredIngredients: { orderBy: { order: 'asc' } },
      },
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
