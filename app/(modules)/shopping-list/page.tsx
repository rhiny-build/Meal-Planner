/**
 * Shopping List Page (Server Component)
 *
 * Fetches initial data and renders the client component.
 * Data fetching happens here, mutations happen via server actions.
 */

import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { getMonday } from '@/lib/dateUtils'
import { ensureShoppingListExists } from './actions'
import ShoppingListClient from './components/ShoppingListClient'

interface PageProps {
  searchParams: Promise<{ week?: string; tab?: string }>
}

async function ShoppingListContent({ searchParams }: PageProps) {
  const params = await searchParams
  const weekParam = params.week
  const tabParam = params.tab

  // Determine the week to display
  const weekStart = weekParam ? getMonday(new Date(weekParam)) : getMonday(new Date())
  weekStart.setHours(0, 0, 0, 0)

  // Ensure shopping list exists (auto-creates with staples if first visit)
  const shoppingList = await ensureShoppingListExists(weekStart)

  // Fetch recipes for linking in items
  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      name: true,
      recipeUrl: true,
    },
  })

  // Fetch categories with their master list items (for staples/restock tabs)
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: {
      items: {
        orderBy: { order: 'asc' },
      },
    },
  })

  return (
    <ShoppingListClient
      initialList={shoppingList}
      initialWeekStart={weekStart}
      initialTab={tabParam as 'meals' | 'staples' | 'restock' | 'list' | undefined}
      recipes={recipes as any}
      categories={categories}
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
