/**
 * Shopping List API Route
 *
 * GET: Fetch shopping list for a specific week
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/shopping-list?weekStart=2024-01-15
 * Fetch shopping list for a specific week
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const weekStartParam = searchParams.get('weekStart')

    if (!weekStartParam) {
      return NextResponse.json(
        { error: 'weekStart query parameter is required' },
        { status: 400 }
      )
    }

    const weekStart = new Date(weekStartParam)
    weekStart.setHours(0, 0, 0, 0)

    const shoppingList = await prisma.shoppingList.findUnique({
      where: { weekStart },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!shoppingList) {
      return NextResponse.json(null)
    }

    return NextResponse.json(shoppingList)
  } catch (error) {
    console.error('Error fetching shopping list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shopping list' },
      { status: 500 }
    )
  }
}
