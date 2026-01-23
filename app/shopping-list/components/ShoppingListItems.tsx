/**
 * Shopping List Items Component
 *
 * Displays the list of items with checkboxes to mark as purchased
 */

'use client'

import type { ShoppingListItem } from '@/types'

interface ShoppingListItemsProps {
  items: ShoppingListItem[]
  onToggle: (itemId: string, checked: boolean) => void
}

export default function ShoppingListItems({
  items,
  onToggle,
}: ShoppingListItemsProps) {
  const uncheckedItems = items.filter((item) => !item.checked)
  const checkedItems = items.filter((item) => item.checked)


  const ItemRow = ({ item }: { item: ShoppingListItem }) => (
    <label
      className={`flex items-center gap-3 p-3 rounded-lg border dark:border-gray-700 cursor-pointer transition-colors ${
        item.checked
          ? 'bg-gray-100 dark:bg-gray-800 opacity-60'
          : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <input
        type="checkbox"
        checked={item.checked}
        onChange={(e) => onToggle(item.id, e.target.checked)}
        className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
      />
      <div className="flex-1">
        <span className={item.checked ? 'line-through text-gray-500' : ''}>
          {item.name}
        </span>
        {item.notes && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {item.notes}
          </p>
        )}
        {item.isManual && (
          <span className="text-xs text-blue-500 ml-2">(added manually)</span>
        )}
      </div>
    </label>
  )

  return (
    <div className="space-y-4">
      {uncheckedItems.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            To Buy ({uncheckedItems.length})
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            Tap an item to mark as purchased
          </p>
          <div className="space-y-2">
            {uncheckedItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {checkedItems.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Got It ({checkedItems.length})
          </h2>
          <div className="space-y-2">
            {checkedItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
