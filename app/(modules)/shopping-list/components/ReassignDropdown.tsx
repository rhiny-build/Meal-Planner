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
    <div className="mt-2 p-2 border rounded-card bg-white">
      <input
        type="text"
        placeholder="Search master items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-2 py-1 text-sm border rounded-card bg-white focus:ring-2 focus:ring-primary focus:outline-none"
        autoFocus
      />
      <ul className="max-h-32 overflow-y-auto mt-1">
        {filtered.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onSelect(item.id)}
              className="w-full text-left px-2 py-1 text-sm hover:bg-primary-soft rounded-card"
            >
              {item.name}
              <span className="text-xs text-ink-soft ml-2">({item.type})</span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-2 py-1 text-sm text-ink-soft">No matches</li>
        )}
      </ul>
      <button
        onClick={onCancel}
        className="mt-1 text-xs text-ink-soft hover:text-ink"
      >
        Cancel
      </button>
    </div>
  )
}
