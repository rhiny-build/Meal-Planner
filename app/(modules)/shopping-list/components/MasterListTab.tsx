'use client'

/**
 * Master List Tab Component
 *
 * Displays staples or restock items grouped by category with checkboxes.
 * - Staples: Checked by default (uncheck to exclude from this week)
 * - Restock: Unchecked by default (check to include in this week)
 */

import { useTransition } from 'react'
import { toast } from 'sonner'
import type { Category, MasterListItem, ShoppingListItem } from '@prisma/client'
import { includeMasterListItem, excludeMasterListItem } from '../actions'

type CategoryWithItems = Category & { items: MasterListItem[] }

interface MasterListTabProps {
  type: 'staple' | 'restock'
  categories: CategoryWithItems[]
  description: string
  weekStart: Date
  includedItemNames: Set<string> // Names of items already in the shopping list
}

export default function MasterListTab({
  type,
  categories,
  description,
  weekStart,
  includedItemNames,
}: MasterListTabProps) {
  const [isPending, startTransition] = useTransition()
  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0)

  // For staples: item is checked if it's in the list OR if it's not explicitly excluded
  // For restock: item is checked only if it's explicitly in the list
  const isItemChecked = (itemName: string): boolean => {
    if (type === 'staple') {
      // Staples default to checked, only unchecked if not in list
      return includedItemNames.has(itemName)
    } else {
      // Restock default to unchecked, only checked if in list
      return includedItemNames.has(itemName)
    }
  }

  const handleToggle = (item: MasterListItem, currentlyChecked: boolean) => {
    startTransition(async () => {
      try {
        if (currentlyChecked) {
          // Remove from shopping list
          await excludeMasterListItem(weekStart, item.name, type)
          toast.success(`Removed "${item.name}" from this week's list`)
        } else {
          // Add to shopping list
          await includeMasterListItem(weekStart, item.id, item.name, type)
          toast.success(`Added "${item.name}" to this week's list`)
        }
      } catch (error) {
        console.error('Error toggling item:', error)
        toast.error('Failed to update item')
      }
    })
  }

  // Count how many items are currently included
  const includedCount = categories.reduce(
    (sum, cat) => sum + cat.items.filter(item => isItemChecked(item.name)).length,
    0
  )

  return (
    <div className="space-y-4">
      {/* Description */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {includedCount} of {totalItems} items included this week
        </p>
      </div>

      {/* Grouped Items */}
      {categories.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">
            No {type === 'staple' ? 'staples' : 'restock items'} yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map(category => {
            const categoryIncludedCount = category.items.filter(item =>
              isItemChecked(item.name)
            ).length

            return (
              <div
                key={category.id}
                className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden"
              >
                {/* Category Header */}
                <div className="px-4 py-3 bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700 flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {category.name}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {categoryIncludedCount} of {category.items.length} included
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {category.items.map(item => {
                    const checked = isItemChecked(item.name)

                    return (
                      <li
                        key={item.id}
                        className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggle(item, checked)}
                          disabled={isPending}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span
                          className={`flex-1 ${
                            checked
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {item.name}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
