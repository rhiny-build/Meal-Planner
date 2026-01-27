/**
 * Shopping List Item API Route - UPDATE
 *
 * Updates a shopping list item (toggle checked, edit details)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ShoppingListItemData } from '@/types'

/**
 * PATCH /api/shopping-list/item/update
 * Updates a shopping list item
 * Request body:
 * - id: Item ID (required)
 * - name?: New name
 * - quantity?: New quantity
 * - unit?: New unit
 * - notes?: New notes
 * - checked?: New checked state
 * - order?: New display order
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
      { error: error instanceof Error ? error.message : 'Failed to update item' },
      { status: 500 }
    )
  }
}
