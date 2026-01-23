/**
 * Shopping List Item API Route
 *
 * POST: Add a manual item to a shopping list
 * PATCH: Update an item (toggle checked, edit details)
 * DELETE: Remove an item
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ShoppingListItemData } from '@/types'

/**
 * POST /api/shopping-list/item
 * Add a manual item to a shopping list
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
        isManual: true, // Manual items are always marked as manual
        order: (maxOrder._max.order ?? -1) + 1,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Error adding shopping list item:', error)
    return NextResponse.json(
      { error: 'Failed to add item' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/shopping-list/item
 * Update a shopping list item
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body as { id: string } & Partial<ShoppingListItemData>

    if (!id) {
      return NextResponse.json(
        { error: 'Item id is required' },
        { status: 400 }
      )
    }

    const item = await prisma.shoppingListItem.update({
      where: { id },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.quantity !== undefined && { quantity: updates.quantity }),
        ...(updates.unit !== undefined && { unit: updates.unit }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.checked !== undefined && { checked: updates.checked }),
        ...(updates.order !== undefined && { order: updates.order }),
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error updating shopping list item:', error)
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/shopping-list/item
 * Delete a shopping list item
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Item id is required' },
        { status: 400 }
      )
    }

    await prisma.shoppingListItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting shopping list item:', error)
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    )
  }
}
