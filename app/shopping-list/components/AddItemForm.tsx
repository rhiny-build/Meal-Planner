/**
 * Add Item Form Component
 *
 * Simple form to add a manual item to the shopping list
 */

'use client'

import { useState } from 'react'
import Button from '@/components/Button'

interface AddItemFormProps {
  onAdd: (name: string, quantity?: string, unit?: string) => void
  onCancel: () => void
}

export default function AddItemForm({ onAdd, onCancel }: AddItemFormProps) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(name.trim(), quantity.trim() || undefined, unit.trim() || undefined)
    setName('')
    setQuantity('')
    setUnit('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
    >
      <h3 className="text-sm font-medium mb-3">Add Item</h3>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Qty"
          className="w-20 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
        />
        <input
          type="text"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unit"
          className="w-24 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          autoFocus
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={!name.trim()}>
            Add
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  )
}
