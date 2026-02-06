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

type CategoryWithItems = Category & { items: MasterListItem[] }

interface CategoriesTabProps {
  categories: CategoryWithItems[]
}

export default function CategoriesTab({ categories }: CategoriesTabProps) {
  const [isPending, startTransition] = useTransition()

  // UI state
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')

  const handleStartEdit = (category: Category) => {
    setEditingCategory(category.id)
    setEditValue(category.name)
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setEditValue('')
  }

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
        setEditingCategory(null)
        setEditValue('')
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
                <li
                  key={category.id}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {editingCategory === category.id ? (
                    // Edit mode
                    <>
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveEdit(category.id)
                          if (e.key === 'Escape') handleCancelEdit()
                        }}
                        className="flex-1 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-600"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(category.id)}
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
                      <div className="flex-1">
                        <span className="text-gray-900 dark:text-gray-100">
                          {category.name}
                        </span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                        </span>
                      </div>
                      <button
                        onClick={() => handleStartEdit(category)}
                        disabled={isPending}
                        className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(category)}
                        disabled={isPending || itemCount > 0}
                        className={`p-1 disabled:opacity-50 ${
                          itemCount > 0
                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                            : 'text-gray-400 hover:text-red-600'
                        }`}
                        title={itemCount > 0 ? `Cannot delete - has ${itemCount} items` : 'Delete'}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </li>
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
