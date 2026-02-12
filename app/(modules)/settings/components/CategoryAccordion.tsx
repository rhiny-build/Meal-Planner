'use client'

/**
 * Collapsible category section with header and item count.
 * Used by MasterListsTab for grouping items by category.
 */

import type { ReactNode } from 'react'

interface CategoryAccordionProps {
  name: string
  itemCount: number
  isExpanded: boolean
  onToggle: () => void
  children: ReactNode
}

export default function CategoryAccordion({
  name,
  itemCount,
  isExpanded,
  onToggle,
  children,
}: CategoryAccordionProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 flex justify-between items-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="text-left">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            {name}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800 border-t dark:border-gray-700">
          {children}
        </ul>
      )}
    </div>
  )
}
