'use client'

/**
 * Settings Client Component
 *
 * Main client component for the settings page.
 * Manages tab navigation and renders tab content.
 */

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Category, MasterListItem, DishType } from '@prisma/client'
import PageHeader from '@/components/PageHeader'
import MasterListsTab from './MasterListsTab'
import CategoriesTab from './CategoriesTab'
import DishTypesTab from './DishTypesTab'
import PreferencesTab from './PreferencesTab'

type CategoryWithItems = Category & { items: MasterListItem[] }
type Tab = 'master-lists' | 'categories' | 'dish-types' | 'preferences'

interface SettingsClientProps {
  initialTab?: Tab
  initialType?: 'staple' | 'restock'
  categories: CategoryWithItems[]
  proteinTypes: DishType[]
  carbTypes: DishType[]
  weekStartDay: number
  showOldShoppingList: boolean
}

export default function SettingsClient({
  initialTab,
  initialType = 'staple',
  categories,
  proteinTypes,
  carbTypes,
  weekStartDay,
  showOldShoppingList,
}: SettingsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const tabs: { key: Tab; label: string }[] = [
    { key: 'master-lists', label: 'Master Lists' },
    { key: 'categories', label: 'Categories' },
    { key: 'dish-types', label: 'Dish Types' },
    { key: 'preferences', label: 'Preferences' },
  ].filter(t => showOldShoppingList || (t.key !== 'master-lists' && t.key !== 'categories')) as { key: Tab; label: string }[]

  // Current tab is derived from URL or initial props; a hidden tab falls back to the first visible one
  const requestedTab = (searchParams.get('tab') as Tab | null) || initialTab
  const activeTab = tabs.some(t => t.key === requestedTab) ? requestedTab! : tabs[0].key
  const defaultTab = tabs[0].key

  const setActiveTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === defaultTab) {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    router.push(`/settings?${params.toString()}`)
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <PageHeader title="Settings" hideSettingsLink />

      {/* Tab Navigation */}
      <div className="flex gap-1.5 bg-sunken p-1 rounded-card mb-5 overflow-x-auto" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`flex-1 min-h-11 px-3 whitespace-nowrap rounded-[11px] text-sm font-semibold transition-colors ${
              activeTab === tab.key ? 'bg-surface text-ink' : 'text-ink-soft'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'master-lists' && (
        <MasterListsTab
          categories={categories}
          initialType={initialType}
        />
      )}
      {activeTab === 'categories' && (
        <CategoriesTab categories={categories} />
      )}
      {activeTab === 'dish-types' && (
        <DishTypesTab proteinTypes={proteinTypes} carbTypes={carbTypes} />
      )}
      {activeTab === 'preferences' && (
        <PreferencesTab weekStartDay={weekStartDay} showOldShoppingList={showOldShoppingList} />
      )}

      <section aria-labelledby="more-heading" className="mt-10 flex flex-col gap-2">
        <h2 id="more-heading" className="font-display text-lg font-bold">
          Behind the scenes
        </h2>
        <Link href="/agent-runs" className="min-h-14 bg-surface rounded-card px-4 py-3 flex flex-col justify-center">
          <span className="font-semibold">Agent runs</span>
          <span className="text-sm text-ink-soft">What the AI helpers did, step by step</span>
        </Link>
        <Link href="/admin/backfill" className="min-h-14 bg-surface rounded-card px-4 py-3 flex flex-col justify-center">
          <span className="font-semibold">Recipe backfill</span>
          <span className="text-sm text-ink-soft">Admin: tidy up older recipes</span>
        </Link>
        <Link href="/admin/receipts" className="min-h-14 bg-surface rounded-card px-4 py-3 flex flex-col justify-center">
          <span className="font-semibold">Receipts</span>
          <span className="text-sm text-ink-soft">Admin: upload Sainsbury&apos;s receipts for Next week</span>
        </Link>
        <Link href="/admin/timings" className="min-h-14 bg-surface rounded-card px-4 py-3 flex flex-col justify-center">
          <span className="font-semibold">Timings</span>
          <span className="text-sm text-ink-soft">Admin: how long each page takes</span>
        </Link>
      </section>
    </div>
  )
}
