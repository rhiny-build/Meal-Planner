/**
 * Shopping List Page (Server Component)
 *
 * Fetches initial data and renders the client component.
 * Data fetching happens here, mutations happen via server actions.
 */

import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { getMonday } from '@/lib/dateUtils'
import ShoppingListClient from './components/ShoppingListClient'

interface PageProps {
  searchParams: Promise<{ week?: string }>
}

async function ShoppingListContent({ searchParams }: PageProps) {
  const params = await searchParams
  const weekParam = params.week

  // Determine the week to display
  const weekStart = weekParam ? getMonday(new Date(weekParam)) : getMonday(new Date())
  weekStart.setHours(0, 0, 0, 0)

  // Fetch shopping list for the week
  const shoppingList = await prisma.shoppingList.findUnique({
    where: { weekStart },
    include: {
      items: {
        orderBy: { order: 'asc' },
      },
    },
  })

  // Fetch recipes for linking in items
  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      name: true,
      recipeUrl: true,
    },
  })

  return (
    <ShoppingListClient
      initialList={shoppingList}
      initialWeekStart={weekStart}
      recipes={recipes as any}
    />
  )
}

export default function ShoppingListPage(props: PageProps) {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading shopping list...</div>}>
      <ShoppingListContent {...props} />
    </Suspense>
  )
}
