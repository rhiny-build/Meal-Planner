/**
 * Settings Page (Server Component)
 *
 * Fetches initial data and renders the client component.
 * Data fetching happens here, mutations happen via server actions.
 */

import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { getWeekStartDay } from './preferenceActions'
import SettingsClient from './components/SettingsClient'

interface PageProps {
  searchParams: Promise<{ tab?: string; type?: string }>
}

async function SettingsContent({ searchParams }: PageProps) {
  const params = await searchParams
  const tabParam = params.tab
  const typeParam = params.type

  // Fetch categories with their master list items
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: {
      items: {
        orderBy: { order: 'asc' },
      },
    },
  })

  // Fetch dish types
  const dishTypes = await prisma.dishType.findMany({
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
  })

  const proteinTypes = dishTypes.filter(t => t.category === 'protein')
  const carbTypes = dishTypes.filter(t => t.category === 'carb')

  const weekStartDay = await getWeekStartDay()

  return (
    <SettingsClient
      initialTab={tabParam as 'master-lists' | 'categories' | 'dish-types' | 'preferences' | undefined}
      initialType={typeParam as 'staple' | 'restock' | undefined}
      categories={categories}
      proteinTypes={proteinTypes}
      carbTypes={carbTypes}
      weekStartDay={weekStartDay}
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
