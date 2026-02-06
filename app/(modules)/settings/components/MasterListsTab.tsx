'use client'

/**
 * Master Lists Tab Component
 *
 * Manages staples and restock master lists.
 * Sub-tabs for Staples/Restock, accordion by category, CRUD operations.
 */

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import type { Category, MasterListItem } from '@prisma/client'
import {
  addMasterListItem,
  updateMasterListItem,
  deleteMasterListItem,
} from '@/app/(modules)/shopping-list/actions'
import Button from '@/components/Button'

type CategoryWithItems = Category & { items: MasterListItem[] }
type ListType = 'staple' | 'restock'

interface MasterListsTabProps {
  categories: CategoryWithItems[]
  initialType?: ListType
}

export default function MasterListsTab({
  categories,
  initialType = 'staple',
}: MasterListsTabProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Sub-tab state from URL
  const typeParam = searchParams.get('type') as ListType | null
  const activeType = typeParam || initialType

  // UI state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('')

  const setActiveType = (type: ListType) => {
    const params = new URLSearchParams(searchParams.toString())
    if (type === 'staple') {
      params.delete('type')
    } else {
      params.set('type', type)
    }
    router.push(`/settings?${params.toString()}`)
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  // Filter categories by active type
  const filteredCategories = categories
    .map(cat => ({
      ...cat,
      items: cat.items.filter(item => item.type === activeType),
    }))
    .filter(cat => cat.items.length > 0)

  const totalItems = filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0)

  const handleStartEdit = (item: MasterListItem) => {
    setEditingItem(item.id)
    setEditValue(item.name)
  }

  const handleCancelEdit = () => {
    setEditingItem(null)
    setEditValue('')
  }

  const handleSaveEdit = (itemId: string) => {
    if (!editValue.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    startTransition(async () => {
      try {
        await updateMasterListItem(itemId, editValue)
        setEditingItem(null)
        setEditValue('')
        toast.success('Item updated')
      } catch (error) {
        console.error('Error updating item:', error)
        toast.error('Failed to update item')
      }
    })
  }

  const handleDelete = (item: MasterListItem) => {
    if (!confirm(`Delete "${item.name}" from ${activeType === 'staple' ? 'staples' : 'restock items'}?`)) {
      return
    }

    startTransition(async () => {
      try {
        await deleteMasterListItem(item.id)
        toast.success('Item deleted')
      } catch (error) {
        console.error('Error deleting item:', error)
        toast.error('Failed to delete item')
      }
    })
  }

  const handleAddItem = () => {
    if (!newItemName.trim()) {
      toast.error('Please enter an item name')
      return
    }
    if (!newItemCategory) {
      toast.error('Please select a category')
      return
    }

    startTransition(async () => {
      try {
        await addMasterListItem(newItemCategory, newItemName, activeType)
        setNewItemName('')
        setNewItemCategory('')
        // Expand the category where the item was added
        setExpandedCategories(prev => new Set(prev).add(newItemCategory))
        toast.success('Item added')
      } catch (error) {
        console.error('Error adding item:', error)
        toast.error('Failed to add item')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Sub-tabs: Staples / Restock */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveType('staple')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeType === 'staple'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          Staples
        </button>
        <button
          onClick={() => setActiveType('restock')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeType === 'restock'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          Restock
        </button>
      </div>

      {/* Description */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {activeType === 'staple'
            ? 'Items you buy every week. These are automatically included when generating a shopping list.'
            : 'Household items you restock as needed. Check these when assembling your weekly shopping list.'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Items by Category */}
      {filteredCategories.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">
            No {activeType === 'staple' ? 'staples' : 'restock items'} yet. Add one below.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCategories.map(category => {
            const isExpanded = expandedCategories.has(category.id)

            return (
              <div
                key={category.id}
                className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden"
              >
                {/* Category Header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 flex justify-between items-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {category.name}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {category.items.length} {category.items.length === 1 ? 'item' : 'items'}
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

                {/* Items List */}
                {isExpanded && (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800 border-t dark:border-gray-700">
                    {category.items.map(item => (
                      <li
                        key={item.id}
                        className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        {editingItem === item.id ? (
                          // Edit mode
                          <>
                            <input
                              type="text"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEdit(item.id)
                                if (e.key === 'Escape') handleCancelEdit()
                              }}
                              className="flex-1 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-600"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              disabled={isPending}
                              className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                              title="Save"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-gray-500 hover:text-gray-700"
                              title="Cancel"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          // View mode
                          <>
                            <span className="flex-1 text-gray-900 dark:text-gray-100">
                              {item.name}
                            </span>
                            <button
                              onClick={() => handleStartEdit(item)}
                              disabled={isPending}
                              className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              disabled={isPending}
                              className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Item Form */}
      <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
          Add New {activeType === 'staple' ? 'Staple' : 'Restock Item'}
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            placeholder="Item name"
            className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
            onKeyDown={e => {
              if (e.key === 'Enter' && newItemName.trim() && newItemCategory) {
                handleAddItem()
              }
            }}
          />
          <select
            value={newItemCategory}
            onChange={e => setNewItemCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="">Select category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <Button
            onClick={handleAddItem}
            disabled={isPending || !newItemName.trim() || !newItemCategory}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}
