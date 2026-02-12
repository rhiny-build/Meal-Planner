import { useState } from 'react'

/**
 * Manages inline editing state for list items.
 *
 * Tracks which item is being edited and the current edit value.
 * Shared by MasterListsTab, DishTypesTab, and CategoriesTab.
 */
export function useInlineEdit() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const startEdit = (id: string, currentValue: string) => {
    setEditingId(id)
    setEditValue(currentValue)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  /** Call after a successful save to reset state */
  const clearEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  return { editingId, editValue, setEditValue, startEdit, cancelEdit, clearEdit }
}
