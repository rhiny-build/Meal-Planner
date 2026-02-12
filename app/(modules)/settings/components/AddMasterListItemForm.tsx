'use client'

/**
 * Add item form for MasterListsTab.
 * Owns its own input state; calls server action and notifies parent on success.
 */

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import type { Category } from '@prisma/client'
import { addMasterListItem } from '@/app/(modules)/shopping-list/actions'
import Button from '@/components/Button'

interface AddMasterListItemFormProps {
  categories: Category[]
  activeType: 'staple' | 'restock'
  onItemAdded: (categoryId: string) => void
}

export default function AddMasterListItemForm({
  categories,
  activeType,
  onItemAdded,
}: AddMasterListItemFormProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error('Please enter an item name')
      return
    }
    if (!categoryId) {
      toast.error('Please select a category')
      return
    }

    startTransition(async () => {
      try {
        await addMasterListItem(categoryId, name, activeType)
        const addedCategoryId = categoryId
        setName('')
        setCategoryId('')
        onItemAdded(addedCategoryId)
        toast.success('Item added')
      } catch (error) {
        console.error('Error adding item:', error)
        toast.error('Failed to add item')
      }
    })
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow">
      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
        Add New {activeType === 'staple' ? 'Staple' : 'Restock Item'}
      </h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Item name"
          className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
          onKeyDown={e => {
            if (e.key === 'Enter' && name.trim() && categoryId) {
              handleAdd()
            }
          }}
        />
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
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
          onClick={handleAdd}
          disabled={isPending || !name.trim() || !categoryId}
        >
          Add
        </Button>
      </div>
    </div>
  )
}
