'use client'

/**
 * Dish Types Tab Component
 *
 * Manages protein and carb types.
 * Add, edit, delete types (delete blocked if recipes use them).
 */

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import type { DishType } from '@prisma/client'
import { addDishType, updateDishType, deleteDishType } from '../actions'
import Button from '@/components/Button'

interface DishTypesTabProps {
  proteinTypes: DishType[]
  carbTypes: DishType[]
}

type TypeCategory = 'protein' | 'carb'

export default function DishTypesTab({ proteinTypes, carbTypes }: DishTypesTabProps) {
  const [isPending, startTransition] = useTransition()

  // UI state
  const [editingType, setEditingType] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newTypeName, setNewTypeName] = useState('')
  const [activeCategory, setActiveCategory] = useState<TypeCategory>('protein')

  const currentTypes = activeCategory === 'protein' ? proteinTypes : carbTypes

  const handleStartEdit = (type: DishType) => {
    setEditingType(type.id)
    setEditValue(type.label)
  }

  const handleCancelEdit = () => {
    setEditingType(null)
    setEditValue('')
  }

  const handleSaveEdit = (typeId: string) => {
    if (!editValue.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    startTransition(async () => {
      const result = await updateDishType(typeId, editValue)
      if (result.error) {
        toast.error(result.error)
      } else {
        setEditingType(null)
        setEditValue('')
        toast.success('Type updated')
      }
    })
  }

  const handleDelete = (type: DishType) => {
    if (!confirm(`Delete "${type.label}"? This cannot be undone.`)) {
      return
    }

    startTransition(async () => {
      const result = await deleteDishType(type.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Type deleted')
      }
    })
  }

  const handleAddType = () => {
    if (!newTypeName.trim()) {
      toast.error('Please enter a type name')
      return
    }

    // Generate value from label (lowercase, hyphenated)
    const value = newTypeName.trim().toLowerCase().replace(/\s+/g, '-')

    startTransition(async () => {
      const result = await addDishType(activeCategory, value, newTypeName.trim())
      if (result.error) {
        toast.error(result.error)
      } else {
        setNewTypeName('')
        toast.success('Type added')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Category Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveCategory('protein')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeCategory === 'protein'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          Protein Types
        </button>
        <button
          onClick={() => setActiveCategory('carb')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeCategory === 'carb'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          Carb Types
        </button>
      </div>

      {/* Description */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {activeCategory === 'protein'
            ? 'Protein types categorize your main dishes (e.g., Chicken, Fish, Vegetarian).'
            : 'Carb types categorize your side dishes (e.g., Rice, Pasta, Fries).'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {currentTypes.length} {currentTypes.length === 1 ? 'type' : 'types'}
        </p>
      </div>

      {/* Types List */}
      {currentTypes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">
            No {activeCategory} types yet. Add one below.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {currentTypes.map(type => (
              <li
                key={type.id}
                className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {editingType === type.id ? (
                  // Edit mode
                  <>
                    <input
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEdit(type.id)
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                      className="flex-1 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-600"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(type.id)}
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
                        {type.label}
                      </span>
                      <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                        ({type.value})
                      </span>
                    </div>
                    <button
                      onClick={() => handleStartEdit(type)}
                      disabled={isPending}
                      className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(type)}
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
        </div>
      )}

      {/* Add Type Form */}
      <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
          Add New {activeCategory === 'protein' ? 'Protein' : 'Carb'} Type
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newTypeName}
            onChange={e => setNewTypeName(e.target.value)}
            placeholder={`Type name (e.g., ${activeCategory === 'protein' ? 'Tofu' : 'Quinoa'})`}
            className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
            onKeyDown={e => {
              if (e.key === 'Enter' && newTypeName.trim()) {
                handleAddType()
              }
            }}
          />
          <Button
            onClick={handleAddType}
            disabled={isPending || !newTypeName.trim()}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}
