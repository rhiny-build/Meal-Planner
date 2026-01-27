/**
 * Shopping List Item API Route - CREATE
 *
 * Adds a manual item to a shopping list
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ShoppingListItemData } from '@/types'

/**
 * POST /api/shopping-list/item
 * Adds a manual item to a shopping list
 * Request body:
 * - shoppingListId: ID of the shopping list
 * - name: Item name (required)
 * - quantity?: Amount
 * - unit?: Unit of measurement
 * - notes?: Additional notes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shoppingListId, ...itemData } = body as { shoppingListId: string } & ShoppingListItemData

    if (!shoppingListId) {
      return NextResponse.json(
        { error: 'shoppingListId is required' },
        { status: 400 }
      )
    }

    if (!itemData.name) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      )
    }

    // Get the current max order for this list
    const maxOrder = await prisma.shoppingListItem.aggregate({
      where: { shoppingListId },
      _max: { order: true },
    })

    const item = await prisma.shoppingListItem.create({
      data: {
        shoppingListId,
        name: itemData.name,
        quantity: itemData.quantity || null,
        unit: itemData.unit || null,
        notes: itemData.notes || null,
        checked: itemData.checked ?? false,
        isManual: true,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Error adding shopping list item:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add item' },
      { status: 500 }
    )
  }
}
