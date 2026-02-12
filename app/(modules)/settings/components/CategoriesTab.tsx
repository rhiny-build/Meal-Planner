'use client'

/**
 * Categories Tab Component
 *
 * Manages categories for staples and restock items.
 * Add, edit, delete categories (delete blocked if items exist).
 */

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import type { Category, MasterListItem } from '@prisma/client'
import { addCategory, updateCategory, deleteCategory } from '../actions'
import Button from '@/components/Button'
import EditableListItem from './EditableListItem'
import { useInlineEdit } from '../hooks/useInlineEdit'

type CategoryWithItems = Category & { items: MasterListItem[] }

interface CategoriesTabProps {
  categories: CategoryWithItems[]
}

export default function CategoriesTab({ categories }: CategoriesTabProps) {
  const [isPending, startTransition] = useTransition()
  const { editingId, editValue, setEditValue, startEdit, cancelEdit, clearEdit } = useInlineEdit()
  const [newCategoryName, setNewCategoryName] = useState('')

  const handleSaveEdit = (categoryId: string) => {
    if (!editValue.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    startTransition(async () => {
      const result = await updateCategory(categoryId, editValue)
      if (result.error) {
        toast.error(result.error)
      } else {
        clearEdit()
        toast.success('Category updated')
      }
    })
  }

  const handleDelete = (category: CategoryWithItems) => {
    const itemCount = category.items.length
    if (itemCount > 0) {
      toast.error(`Cannot delete "${category.name}" - it has ${itemCount} item${itemCount === 1 ? '' : 's'}. Move or delete them first.`)
      return
    }

    if (!confirm(`Delete category "${category.name}"?`)) {
      return
    }

    startTransition(async () => {
      const result = await deleteCategory(category.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Category deleted')
      }
    })
  }

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name')
      return
    }

    startTransition(async () => {
      const result = await addCategory(newCategoryName)
      if (result.error) {
        toast.error(result.error)
      } else {
        setNewCategoryName('')
        toast.success('Category added')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Categories organize your staples and restock items by store section (e.g., Dairy, Produce, Household).
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {categories.length} {categories.length === 1 ? 'category' : 'categories'}
        </p>
      </div>

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">
            No categories yet. Add one below.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {categories.map(category => {
              const itemCount = category.items.length

              return (
                <EditableListItem
                  key={category.id}
                  id={category.id}
                  isEditing={editingId === category.id}
                  editValue={editValue}
                  isPending={isPending}
                  onEditValueChange={setEditValue}
                  onStartEdit={() => startEdit(category.id, category.name)}
                  onSaveEdit={() => handleSaveEdit(category.id)}
                  onCancelEdit={cancelEdit}
                  onDelete={() => handleDelete(category)}
                  deleteDisabled={itemCount > 0}
                  deleteTitle={itemCount > 0 ? `Cannot delete - has ${itemCount} items` : 'Delete'}
                >
                  <div className="flex-1">
                    <span className="text-gray-900 dark:text-gray-100">
                      {category.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                    </span>
                  </div>
                </EditableListItem>
              )
            })}
          </ul>
        </div>
      )}

      {/* Add Category Form */}
      <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
          Add New Category
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            placeholder="Category name (e.g., Bakery)"
            className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
            onKeyDown={e => {
              if (e.key === 'Enter' && newCategoryName.trim()) {
                handleAddCategory()
              }
            }}
          />
          <Button
            onClick={handleAddCategory}
            disabled={isPending || !newCategoryName.trim()}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}
