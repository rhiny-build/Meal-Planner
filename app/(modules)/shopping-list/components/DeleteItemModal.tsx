'use client'

import { useState, useMemo } from 'react'
import type { ShoppingListItem, Category, MasterListItem } from '@prisma/client'
import Button from '@/components/Button'

type CategoryWithItems = Category & { items: MasterListItem[] }

interface DeleteItemModalProps {
  item: ShoppingListItem
  categories: CategoryWithItems[]
  onMapToExisting: (masterItemId: string) => void
  onCreateAndMap: (name: string, type: 'staple' | 'restock', categoryId: string) => void
  onJustDelete: () => void
  onClose: () => void
  isPending: boolean
}

type Mode = 'choose' | 'mapExisting' | 'createNew'

export default function DeleteItemModal({
  item,
  categories,
  onMapToExisting,
  onCreateAndMap,
  onJustDelete,
  onClose,
  isPending,
}: DeleteItemModalProps) {
  const [mode, setMode] = useState<Mode>('choose')

  // Option A state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Option B state
  const [newItemName, setNewItemName] = useState(item.name)
  const [newItemType, setNewItemType] = useState<'staple' | 'restock'>('staple')
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id ?? '')

  const allMasterItems = useMemo(
    () => categories.flatMap((c) => c.items),
    [categories]
  )

  const filteredItems = useMemo(
    () =>
      searchTerm.trim()
        ? allMasterItems.filter((m) =>
            m.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : allMasterItems,
    [allMasterItems, searchTerm]
  )

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">
          What is &lsquo;{item.name}&rsquo;?
        </h2>

        {mode === 'choose' && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('mapExisting')}
              className="w-full text-left p-3 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <p className="font-medium">Map to existing item</p>
              <p className="text-sm text-gray-500">Link to something already on your master list</p>
            </button>
            <button
              onClick={() => setMode('createNew')}
              className="w-full text-left p-3 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <p className="font-medium">Add to master list</p>
              <p className="text-sm text-gray-500">Create a new staple or restock item</p>
            </button>
            <button
              onClick={onJustDelete}
              disabled={isPending}
              className="w-full text-center text-sm text-gray-500 hover:text-red-500 transition-colors py-2"
            >
              Just remove it
            </button>
          </div>
        )}

        {mode === 'mapExisting' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Search master list..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <ul className="max-h-48 overflow-y-auto border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
              {filteredItems.length === 0 && (
                <li className="p-3 text-sm text-gray-500">No items found</li>
              )}
              {filteredItems.map((m) => (
                <li
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`p-3 cursor-pointer text-sm transition-colors ${
                    selectedId === m.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {m.name}
                  <span className="text-xs text-gray-400 ml-2">({m.type})</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setMode('choose')}>
                Back
              </Button>
              <Button
                size="sm"
                disabled={!selectedId || isPending}
                onClick={() => selectedId && onMapToExisting(selectedId)}
              >
                {isPending ? 'Saving...' : 'Confirm'}
              </Button>
            </div>
          </div>
        )}

        {mode === 'createNew' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <div className="flex gap-2">
                {(['staple', 'restock'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNewItemType(t)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      newItemType === t
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setMode('choose')}>
                Back
              </Button>
              <Button
                size="sm"
                disabled={!newItemName.trim() || !selectedCategoryId || isPending}
                onClick={() => onCreateAndMap(newItemName.trim(), newItemType, selectedCategoryId)}
              >
                {isPending ? 'Saving...' : 'Create & Map'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
