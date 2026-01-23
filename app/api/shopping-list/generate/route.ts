/**
 * Generate Shopping List API Route
 *
 * POST: Generate a shopping list from the week's meal plan
 * Aggregates ingredients from all recipes in the meal plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { GenerateShoppingListRequest, AggregatedIngredient } from '@/types'

/**
 * Normalize an ingredient name for grouping
 * - Lowercase
 * - Remove extra whitespace
 * - Basic singularization (optional, can be enhanced)
 */
function normalizeIngredientName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Aggregate ingredients from multiple recipes
 * Groups by normalized name, combines quantities when units match
 */
function aggregateIngredients(
  ingredients: Array<{
    name: string
    quantity: string | null
    unit: string | null
    recipeName: string
  }>
): AggregatedIngredient[] {
  const grouped = new Map<string, AggregatedIngredient>()

  for (const ing of ingredients) {
    const normalizedName = normalizeIngredientName(ing.name)

    if (!grouped.has(normalizedName)) {
      grouped.set(normalizedName, {
        name: ing.name, // Keep original casing from first occurrence
        quantities: [],
      })
    }

    const aggregated = grouped.get(normalizedName)!
    aggregated.quantities.push({
      quantity: ing.quantity,
      unit: ing.unit,
      source: ing.recipeName,
    })
  }

  // Process each aggregated ingredient
  const result: AggregatedIngredient[] = []

  for (const [, agg] of grouped) {
    // Check if all quantities have the same unit (or no unit)
    const units = new Set(agg.quantities.map((q) => q.unit?.toLowerCase() || null))
    const hasConsistentUnits = units.size === 1

    if (hasConsistentUnits && agg.quantities.some((q) => q.quantity)) {
      // Try to combine quantities
      const unit = agg.quantities[0].unit
      const quantityStrs = agg.quantities
        .filter((q) => q.quantity)
        .map((q) => q.quantity!)

      // For now, just join quantities with +
      // A more sophisticated version could do math with fractions
      agg.combinedQuantity = quantityStrs.join(' + ')
      agg.combinedUnit = unit || undefined
    }

    // Add source recipes as notes
    const sources = [...new Set(agg.quantities.map((q) => q.source))]
    agg.notes = `From: ${sources.join(', ')}`

    result.push(agg)
  }

  // Sort alphabetically
  result.sort((a, b) => a.name.localeCompare(b.name))

  return result
}

/**
 * POST /api/shopping-list/generate
 * Generate a shopping list from the week's meal plan
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateShoppingListRequest

    if (!body.weekStart) {
      return NextResponse.json(
        { error: 'weekStart is required' },
        { status: 400 }
      )
    }

    const weekStart = new Date(body.weekStart)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    // Fetch meal plans for the week with recipes and their structured ingredients
    const mealPlans = await prisma.mealPlan.findMany({
      where: {
        date: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      include: {
        proteinRecipe: {
          include: {
            structuredIngredients: {
              orderBy: { order: 'asc' },
            },
          },
        },
        carbRecipe: {
          include: {
            structuredIngredients: {
              orderBy: { order: 'asc' },
            },
          },
        },
        vegetableRecipe: {
          include: {
            structuredIngredients: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })

    // Collect all ingredients from all recipes
    const allIngredients: Array<{
      name: string
      quantity: string | null
      unit: string | null
      recipeName: string
    }> = []

    for (const plan of mealPlans) {
      const recipes = [plan.proteinRecipe, plan.carbRecipe, plan.vegetableRecipe]

      for (const recipe of recipes) {
        if (recipe && recipe.structuredIngredients) {
          for (const ing of recipe.structuredIngredients) {
            allIngredients.push({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              recipeName: recipe.name,
            })
          }
        }
      }
    }

    // Aggregate ingredients
    const aggregatedIngredients = aggregateIngredients(allIngredients)

    // Create or update the shopping list
    const shoppingList = await prisma.shoppingList.upsert({
      where: { weekStart },
      create: {
        weekStart,
        items: {
          create: aggregatedIngredients.map((ing, index) => ({
            name: ing.name,
            quantity: ing.combinedQuantity || null,
            unit: ing.combinedUnit || null,
            notes: ing.notes || null,
            checked: false,
            isManual: false,
            order: index,
          })),
        },
      },
      update: {
        updatedAt: new Date(),
        items: {
          deleteMany: { isManual: false }, // Only delete auto-generated items
          create: aggregatedIngredients.map((ing, index) => ({
            name: ing.name,
            quantity: ing.combinedQuantity || null,
            unit: ing.combinedUnit || null,
            notes: ing.notes || null,
            checked: false,
            isManual: false,
            order: index,
          })),
        },
      },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json(shoppingList, { status: 201 })
  } catch (error) {
    console.error('Error generating shopping list:', error)
    return NextResponse.json(
      { error: 'Failed to generate shopping list' },
      { status: 500 }
    )
  }
}
