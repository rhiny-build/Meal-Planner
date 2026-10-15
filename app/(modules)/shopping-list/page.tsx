/**
 * Shopping List Page (Server Component)
 *
 * Fetches initial data and renders the client component.
 * Data fetching happens here, mutations happen via server actions.
 */

import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { getWeekStart, formatDateParam, parseDateParam } from '@/lib/dateUtils'
import { getWeekStartDay, getShowOldShoppingList } from '@/app/(modules)/settings/preferenceActions'
import { ensureShoppingListExists } from './actions'
import ShoppingListClient from './components/ShoppingListClient'
import NextWeekOnly from './components/nextWeek/NextWeekOnly'
import { loadNextWeek, nextWeekStart } from '@/lib/nextWeek/loadNextWeek'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ week?: string; tab?: string }>
}

async function ShoppingListContent({ searchParams }: PageProps) {
  const params = await searchParams
  const weekParam = params.week
  const tabParam = params.tab

  // Determine the week to display
  const startDay = await getWeekStartDay()
  const weekStart = weekParam ? getWeekStart(parseDateParam(weekParam), startDay) : getWeekStart(new Date(), startDay)
  weekStart.setHours(0, 0, 0, 0)

  // Old shopping list switched off (Settings): only the Next week view
  if (!(await getShowOldShoppingList())) {
    const nextWeekData = await loadNextWeek(prisma, nextWeekStart(new Date(), startDay))
    return <NextWeekOnly data={nextWeekData} />
  }

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

  // The Next week view is the default tab; it is recomputed on every visit, never saved
  const nextWeek = !tabParam || tabParam === 'next' ? await loadNextWeek(prisma, nextWeekStart(new Date(), startDay)) : null

  return (
    <ShoppingListClient
      initialList={shoppingList}
      initialWeekStart={formatDateParam(weekStart)}
      startDay={startDay}
      initialTab={tabParam as 'next' | 'meals' | 'staples' | 'restock' | 'list' | undefined}
      nextWeek={nextWeek}
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
