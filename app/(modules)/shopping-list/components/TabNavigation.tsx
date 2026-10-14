'use client'

/**
 * Tab Navigation for the Shopping List page.
 *
 * Renders the tab bar (Next week / Meals / Staples / Restock / Shopping List). Two labels are shortened on a phone so all five tabs fit.
 */

import type { Tab } from '../hooks/useShoppingList'

const TABS: { key: Tab; label: string; short?: string }[] = [
  { key: 'next', label: 'Next week' },
  { key: 'meals', label: "This Week's Meals", short: 'Meals' },
  { key: 'staples', label: 'Staples' },
  { key: 'restock', label: 'Restock' },
  { key: 'list', label: 'Shopping List', short: 'List' },
]

interface TabNavigationProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex gap-1.5 bg-sunken p-1 rounded-card mb-5 overflow-x-auto" role="tablist">
      {TABS.map(({ key, label, short }) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          role="tab"
          aria-selected={activeTab === key}
          className={`flex-1 min-h-11 px-2 whitespace-nowrap rounded-[11px] text-[13px] sm:text-sm font-semibold transition-colors ${
            activeTab === key ? 'bg-surface text-ink' : 'text-ink-soft'
          }`}
        >
          {short ? (
            <>
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
            </>
          ) : (
            label
          )}
        </button>
      ))}
    </div>
  )
}
