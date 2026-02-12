'use client'

/**
 * Dish Types Tab Component
 *
 * Manages protein and carb types.
 * Add, edit, delete types (delete blocked if recipes use them).
 */

import { useTransition, useState } from 'react'
import { toast } from 'sonner'
import type { DishType } from '@prisma/client'
import { addDishType, updateDishType, deleteDishType } from '../actions'
import Button from '@/components/Button'
import EditableListItem from './EditableListItem'
import { useInlineEdit } from '../hooks/useInlineEdit'

interface DishTypesTabProps {
  proteinTypes: DishType[]
  carbTypes: DishType[]
}

type TypeCategory = 'protein' | 'carb'

export default function DishTypesTab({ proteinTypes, carbTypes }: DishTypesTabProps) {
  const [isPending, startTransition] = useTransition()
  const { editingId, editValue, setEditValue, startEdit, cancelEdit, clearEdit } = useInlineEdit()
  const [newTypeName, setNewTypeName] = useState('')
  const [activeCategory, setActiveCategory] = useState<TypeCategory>('protein')

  const currentTypes = activeCategory === 'protein' ? proteinTypes : carbTypes

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
        clearEdit()
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
              <EditableListItem
                key={type.id}
                id={type.id}
                isEditing={editingId === type.id}
                editValue={editValue}
                isPending={isPending}
                onEditValueChange={setEditValue}
                onStartEdit={() => startEdit(type.id, type.label)}
                onSaveEdit={() => handleSaveEdit(type.id)}
                onCancelEdit={cancelEdit}
                onDelete={() => handleDelete(type)}
              >
                <div className="flex-1">
                  <span className="text-gray-900 dark:text-gray-100">
                    {type.label}
                  </span>
                  <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                    ({type.value})
                  </span>
                </div>
              </EditableListItem>
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
