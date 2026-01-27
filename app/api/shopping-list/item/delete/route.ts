/**
 * Shopping List Item API Route - DELETE
 *
 * Removes an item from a shopping list
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/shopping-list/item/delete
 * Deletes a shopping list item
 * Request body:
 * - id: Item ID to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Item id is required' },
        { status: 400 }
      )
    }

    await prisma.shoppingListItem.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error deleting shopping list item:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete item' },
      { status: 500 }
    )
  }
}
