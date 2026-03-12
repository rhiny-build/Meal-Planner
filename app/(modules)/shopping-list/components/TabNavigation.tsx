'use client'

type Tab = 'meals' | 'staples' | 'restock' | 'list'

const TABS: { key: Tab; label: string }[] = [
  { key: 'meals', label: "This Week's Meals" },
  { key: 'staples', label: 'Staples' },
  { key: 'restock', label: 'Restock' },
  { key: 'list', label: 'Shopping List' },
]

interface TabNavigationProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === key
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
