/**
 * Settings Page (Server Component)
 *
 * Fetches initial data and renders the client component.
 * Data fetching happens here, mutations happen via server actions.
 */

import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { getWeekStartDay, getShowOldShoppingList } from './preferenceActions'
import SettingsClient from './components/SettingsClient'
import { measured } from '@/lib/timing/measure'

interface PageProps {
  searchParams: Promise<{ tab?: string; type?: string }>
}

async function SettingsContentImpl({ searchParams }: PageProps) {
  const params = await searchParams
  const tabParam = params.tab
  const typeParam = params.type

  // Independent reads, asked for together. Categories and master list items belong to the old shopping
  // list, so they are only loaded when it is shown.
  const [showOldShoppingList, dishTypes, weekStartDay] = await Promise.all([
    getShowOldShoppingList(),
    prisma.dishType.findMany({ orderBy: [{ category: 'asc' }, { order: 'asc' }] }),
    getWeekStartDay(),
  ])
  const categories = showOldShoppingList
    ? await prisma.category.findMany({
        orderBy: { order: 'asc' },
        include: { items: { orderBy: { order: 'asc' } } },
      })
    : []

  const proteinTypes = dishTypes.filter(t => t.category === 'protein')
  const carbTypes = dishTypes.filter(t => t.category === 'carb')

  return (
    <SettingsClient
      initialTab={tabParam as 'master-lists' | 'categories' | 'dish-types' | 'preferences' | undefined}
      initialType={typeParam as 'staple' | 'restock' | undefined}
      categories={categories}
      proteinTypes={proteinTypes}
      carbTypes={carbTypes}
      weekStartDay={weekStartDay}
      showOldShoppingList={showOldShoppingList}
    />
  )
}

export default function SettingsPage(props: PageProps) {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading settings...</div>}>
      <SettingsContent {...props} />
    </Suspense>
  )
}

const SettingsContent = measured('page', '/settings', SettingsContentImpl)
