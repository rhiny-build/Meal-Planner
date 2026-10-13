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
    <div className="bg-white rounded-card shadow overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 bg-sunken flex justify-between items-center hover:bg-sunken transition-colors"
      >
        <div className="text-left">
          <h3 className="font-medium text-ink">
            {name}
          </h3>
          <span className="text-xs text-ink-soft">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-ink-soft transition-transform duration-200 ${
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
        <ul className="divide-y divide-line border-t">
          {children}
        </ul>
      )}
    </div>
  )
}
