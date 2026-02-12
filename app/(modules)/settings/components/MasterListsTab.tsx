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
  updateMasterListItem,
  deleteMasterListItem,
} from '@/app/(modules)/shopping-list/actions'
import EditableListItem from './EditableListItem'
import CategoryAccordion from './CategoryAccordion'
import AddMasterListItemForm from './AddMasterListItemForm'
import { useInlineEdit } from '../hooks/useInlineEdit'

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
  const { editingId, editValue, setEditValue, startEdit, cancelEdit, clearEdit } = useInlineEdit()

  // Sub-tab state from URL
  const typeParam = searchParams.get('type') as ListType | null
  const activeType = typeParam || initialType

  // Accordion state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

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

  const handleSaveEdit = (itemId: string) => {
    if (!editValue.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    startTransition(async () => {
      try {
        await updateMasterListItem(itemId, editValue)
        clearEdit()
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

  const handleItemAdded = (categoryId: string) => {
    setExpandedCategories(prev => new Set(prev).add(categoryId))
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
          {filteredCategories.map(category => (
            <CategoryAccordion
              key={category.id}
              name={category.name}
              itemCount={category.items.length}
              isExpanded={expandedCategories.has(category.id)}
              onToggle={() => toggleCategory(category.id)}
            >
              {category.items.map(item => (
                <EditableListItem
                  key={item.id}
                  id={item.id}
                  isEditing={editingId === item.id}
                  editValue={editValue}
                  isPending={isPending}
                  onEditValueChange={setEditValue}
                  onStartEdit={() => startEdit(item.id, item.name)}
                  onSaveEdit={() => handleSaveEdit(item.id)}
                  onCancelEdit={cancelEdit}
                  onDelete={() => handleDelete(item)}
                >
                  <span className="flex-1 text-gray-900 dark:text-gray-100">
                    {item.name}
                  </span>
                </EditableListItem>
              ))}
            </CategoryAccordion>
          ))}
        </div>
      )}

      <AddMasterListItemForm
        categories={categories}
        activeType={activeType}
        onItemAdded={handleItemAdded}
      />
    </div>
  )
}
