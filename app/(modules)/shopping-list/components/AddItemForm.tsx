/**
 * Add Item Form Component
 *
 * Form to add an item to the shopping list, optionally saving it
 * to the master list as a staple or restock item.
 */

'use client'

import { useState } from 'react'
import type { Category, MasterListItem } from '@prisma/client'
import Button from '@/components/Button'

type CategoryWithItems = Category & { items: MasterListItem[] }
type AddMode = 'list-only' | 'staple' | 'restock'

interface AddItemFormProps {
  onAdd: (name: string) => void
  onAddToMasterList: (name: string, type: 'staple' | 'restock', categoryId: string) => void
  onCancel: () => void
  categories: CategoryWithItems[]
}

export default function AddItemForm({ onAdd, onAddToMasterList, onCancel, categories }: AddItemFormProps) {
  const [name, setName] = useState('')
  const [mode, setMode] = useState<AddMode>('list-only')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (mode === 'list-only') {
      onAdd(name.trim())
    } else {
      onAddToMasterList(name.trim(), mode, categoryId)
    }
    setName('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
    >
      <h3 className="text-sm font-medium mb-3">Add Item</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name (e.g. milk, bread)"
          className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          autoFocus
        />
        <Button type="submit" size="sm" disabled={!name.trim()}>
          Add
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Also remember for future weeks?</p>
        <div className="flex gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
          {([
            { value: 'list-only', label: 'This week only' },
            { value: 'staple', label: 'Save as Staple' },
            { value: 'restock', label: 'Save as Restock' },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-colors ${
                mode === value
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white font-medium shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode !== 'list-only' && (
        <div className="mt-3">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </form>
  )
}
