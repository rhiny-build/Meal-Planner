/**
 * Shopping List Items Component
 *
 * Displays the list of items with checkboxes
 */

'use client'

import type { ShoppingListItem } from '@/types'

interface ShoppingListItemsProps {
  items: ShoppingListItem[]
  onToggle: (itemId: string, checked: boolean) => void
  onDelete: (itemId: string) => void
}

export default function ShoppingListItems({
  items,
  onToggle,
  onDelete,
}: ShoppingListItemsProps) {
  // Separate checked and unchecked items
  const uncheckedItems = items.filter((item) => !item.checked)
  const checkedItems = items.filter((item) => item.checked)

  const formatItem = (item: ShoppingListItem) => {
    const parts = []
    if (item.quantity) parts.push(item.quantity)
    if (item.unit) parts.push(item.unit)
    parts.push(item.name)
    return parts.join(' ')
  }

  const ItemRow = ({ item }: { item: ShoppingListItem }) => (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border dark:border-gray-700 ${
        item.checked
          ? 'bg-gray-100 dark:bg-gray-800 opacity-60'
          : 'bg-white dark:bg-gray-900'
      }`}
    >
      <input
        type="checkbox"
        checked={item.checked}
        onChange={(e) => onToggle(item.id, e.target.checked)}
        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1">
        <span className={item.checked ? 'line-through text-gray-500' : ''}>
          {formatItem(item)}
        </span>
        {item.notes && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {item.notes}
          </p>
        )}
        {item.isManual && (
          <span className="text-xs text-blue-500 ml-2">(manual)</span>
        )}
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="text-red-500 hover:text-red-700 text-sm px-2"
        title="Delete item"
      >
        &times;
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Unchecked Items */}
      {uncheckedItems.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            To Buy ({uncheckedItems.length})
          </h2>
          <div className="space-y-2">
            {uncheckedItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Checked Items */}
      {checkedItems.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Purchased ({checkedItems.length})
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
