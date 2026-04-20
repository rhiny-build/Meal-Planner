'use client'

/**
 * Settings Client Component
 *
 * Main client component for the settings page.
 * Manages tab navigation and renders tab content.
 */

import { useRouter, useSearchParams } from 'next/navigation'
import type { Category, MasterListItem, DishType } from '@prisma/client'
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
}

export default function SettingsClient({
  initialTab = 'master-lists',
  initialType = 'staple',
  categories,
  proteinTypes,
  carbTypes,
  weekStartDay,
}: SettingsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Current tab is derived from URL or initial props
  const tabParam = searchParams.get('tab') as Tab | null
  const activeTab = tabParam || initialTab

  const setActiveTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'master-lists') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    router.push(`/settings?${params.toString()}`)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'master-lists', label: 'Master Lists' },
    { key: 'categories', label: 'Categories' },
    { key: 'dish-types', label: 'Dish Types' },
    { key: 'preferences', label: 'Preferences' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
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
        <PreferencesTab weekStartDay={weekStartDay} />
      )}
    </div>
  )
}
