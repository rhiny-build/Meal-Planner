/**
 * Reassign Dropdown — searchable master item picker for reassigning suggestions.
 */

import { useState, useMemo } from 'react'
import type { MasterListItem } from '@prisma/client'

interface ReassignDropdownProps {
  masterItems: MasterListItem[]
  onSelect: (masterItemId: string) => void
  onCancel: () => void
}

export default function ReassignDropdown({ masterItems, onSelect, onCancel }: ReassignDropdownProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      search.trim()
        ? masterItems.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
        : masterItems,
    [masterItems, search]
  )

  return (
    <div className="mt-2 p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600">
      <input
        type="text"
        placeholder="Search master items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        autoFocus
      />
      <ul className="max-h-32 overflow-y-auto mt-1">
        {filtered.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onSelect(item.id)}
              className="w-full text-left px-2 py-1 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 rounded"
            >
              {item.name}
              <span className="text-xs text-gray-400 ml-2">({item.type})</span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-2 py-1 text-sm text-gray-400">No matches</li>
        )}
      </ul>
      <button
        onClick={onCancel}
        className="mt-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        Cancel
      </button>
    </div>
  )
}
