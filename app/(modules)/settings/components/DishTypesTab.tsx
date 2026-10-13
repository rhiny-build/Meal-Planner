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
          className={`px-4 py-2 rounded-card text-sm font-medium transition-colors ${
            activeCategory === 'protein'
              ? 'bg-primary-soft text-primary  '
              : 'bg-sunken text-ink-soft hover:bg-sunken   '
          }`}
        >
          Protein Types
        </button>
        <button
          onClick={() => setActiveCategory('carb')}
          className={`px-4 py-2 rounded-card text-sm font-medium transition-colors ${
            activeCategory === 'carb'
              ? 'bg-primary-soft text-primary  '
              : 'bg-sunken text-ink-soft hover:bg-sunken   '
          }`}
        >
          Carb Types
        </button>
      </div>

      {/* Description */}
      <div className="p-4 bg-ground rounded-card">
        <p className="text-sm text-ink-soft">
          {activeCategory === 'protein'
            ? 'Protein types categorize your main dishes (e.g., Chicken, Fish, Vegetarian).'
            : 'Carb types categorize your side dishes (e.g., Rice, Pasta, Fries).'}
        </p>
        <p className="text-xs text-ink-soft mt-1">
          {currentTypes.length} {currentTypes.length === 1 ? 'type' : 'types'}
        </p>
      </div>

      {/* Types List */}
      {currentTypes.length === 0 ? (
        <div className="text-center py-12 bg-ground rounded-card">
          <p className="text-ink-soft">
            No {activeCategory} types yet. Add one below.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-card shadow overflow-hidden">
          <ul className="divide-y divide-line">
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
                  <span className="text-ink">
                    {type.label}
                  </span>
                  <span className="ml-2 text-xs text-ink-soft">
                    ({type.value})
                  </span>
                </div>
              </EditableListItem>
            ))}
          </ul>
        </div>
      )}

      {/* Add Type Form */}
      <div className="p-4 bg-white rounded-card shadow">
        <h3 className="font-medium text-ink mb-3">
          Add New {activeCategory === 'protein' ? 'Protein' : 'Carb'} Type
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newTypeName}
            onChange={e => setNewTypeName(e.target.value)}
            placeholder={`Type name (e.g., ${activeCategory === 'protein' ? 'Tofu' : 'Quinoa'})`}
            className="flex-1 px-3 py-2 border rounded-card"
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
