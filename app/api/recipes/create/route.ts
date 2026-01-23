/**
 * Create Recipe API Route
 *
 * POST: Create a new recipe with structured ingredients
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { RecipeFormData } from '@/types'
import { parseIngredientLine } from '@/lib/ingredientParser'

/**
 * POST /api/recipes/create
 * Creates a new recipe with structured ingredients
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

    // Prepare structured ingredients
    let structuredIngredients = body.structuredIngredients

    // If no structured ingredients provided, parse from the ingredients text
    if (!structuredIngredients || structuredIngredients.length === 0) {
      const lines = body.ingredients
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

      structuredIngredients = lines.map((line, index) => {
        const parsed = parseIngredientLine(line)
        return {
          name: parsed.name || line,
          quantity: parsed.quantity || null,
          unit: parsed.unit || null,
          notes: parsed.notes || null,
          order: index,
        }
      })
    }

    // Create the recipe with structured ingredients
    const recipe = await prisma.recipe.create({
      data: {
        name: body.name,
        recipeUrl: body.recipeUrl || null,
        ingredients: body.ingredients,
        proteinType: body.proteinType || null,
        carbType: body.carbType || null,
        prepTime: body.prepTime || null,
        tier: body.tier || 'favorite',
        structuredIngredients: {
          create: structuredIngredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
            order: ing.order,
          })),
        },
      },
      include: {
        structuredIngredients: true,
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
