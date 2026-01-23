/**
 * Generate Shopping List API Route
 *
 * POST: Generate a shopping list from the week's meal plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aggregateIngredients, collectIngredientsFromMealPlans } from '@/lib/shoppingListHelpers'
import type { GenerateShoppingListRequest } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateShoppingListRequest

    if (!body.weekStart) {
      return NextResponse.json({ error: 'weekStart is required' }, { status: 400 })
    }

    const weekStart = new Date(body.weekStart)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const mealPlans = await prisma.mealPlan.findMany({
      where: { date: { gte: weekStart, lt: weekEnd } },
      include: {
        proteinRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
        carbRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
        vegetableRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
      },
    })

    const allIngredients = collectIngredientsFromMealPlans(mealPlans)
    const aggregatedItems = aggregateIngredients(allIngredients)

    const shoppingList = await prisma.shoppingList.upsert({
      where: { weekStart },
      create: {
        weekStart,
        items: {
          create: aggregatedItems.map((item, index) => ({
            name: item.name,
            notes: `For: ${item.sources.join(', ')}`,
            checked: false,
            isManual: false,
            order: index,
          })),
        },
      },
      update: {
        updatedAt: new Date(),
        items: {
          deleteMany: { isManual: false },
          create: aggregatedItems.map((item, index) => ({
            name: item.name,
            notes: `For: ${item.sources.join(', ')}`,
            checked: false,
            isManual: false,
            order: index,
          })),
        },
      },
      include: { items: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json(shoppingList, { status: 201 })
  } catch (error) {
    console.error('Error generating shopping list:', error)
    return NextResponse.json({ error: 'Failed to generate shopping list' }, { status: 500 })
  }
}
