/**
 * Shopping List Page
 *
 * Features:
 * - Generate shopping list from current week's meal plan
 * - View aggregated ingredients
 * - Check off items as purchased
 * - Add manual items
 * - Export as text
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { getMonday } from '@/lib/dateUtils'
import Button from '@/components/Button'
import type { ShoppingListWithItems, ShoppingListItem } from '@/types'
import ShoppingListHeader from './components/ShoppingListHeader'
import ShoppingListItems from './components/ShoppingListItems'
import AddItemForm from './components/AddItemForm'

export default function ShoppingListPage() {
  const [startDate, setStartDate] = useState<Date>(getMonday(new Date()))
  const [shoppingList, setShoppingList] = useState<ShoppingListWithItems | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const fetchShoppingList = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/shopping-list?weekStart=${startDate.toISOString()}`
      )
      const data = await response.json()
      setShoppingList(data)
    } catch (error) {
      console.error('Error fetching shopping list:', error)
    } finally {
      setIsLoading(false)
    }
  }, [startDate])

  useEffect(() => {
    fetchShoppingList()
  }, [fetchShoppingList])

  const handlePreviousWeek = () => {
    const newDate = new Date(startDate)
    newDate.setDate(newDate.getDate() - 7)
    setStartDate(newDate)
  }

  const handleNextWeek = () => {
    const newDate = new Date(startDate)
    newDate.setDate(newDate.getDate() + 7)
    setStartDate(newDate)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/shopping-list/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: startDate.toISOString() }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate shopping list')
      }

      const data = await response.json()
      setShoppingList(data)
    } catch (error) {
      console.error('Error generating shopping list:', error)
      alert('Failed to generate shopping list')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleToggleItem = async (itemId: string, checked: boolean) => {
    try {
      const response = await fetch('/api/shopping-list/item', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, checked }),
      })

      if (response.ok) {
        // Update local state
        setShoppingList((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            items: prev.items.map((item) =>
              item.id === itemId ? { ...item, checked } : item
            ),
          }
        })
      }
    } catch (error) {
      console.error('Error toggling item:', error)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this item?')) return

    try {
      const response = await fetch(`/api/shopping-list/item?id=${itemId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setShoppingList((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            items: prev.items.filter((item) => item.id !== itemId),
          }
        })
      }
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const handleAddItem = async (name: string, quantity?: string, unit?: string) => {
    if (!shoppingList) return

    try {
      const response = await fetch('/api/shopping-list/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shoppingListId: shoppingList.id,
          name,
          quantity: quantity || null,
          unit: unit || null,
        }),
      })

      if (response.ok) {
        const newItem = await response.json()
        setShoppingList((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            items: [...prev.items, newItem],
          }
        })
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  const handleExportText = () => {
    if (!shoppingList || shoppingList.items.length === 0) {
      alert('No items to export')
      return
    }

    const uncheckedItems = shoppingList.items.filter((item) => !item.checked)

    const text = uncheckedItems
      .map((item) => {
        const parts = []
        if (item.quantity) parts.push(item.quantity)
        if (item.unit) parts.push(item.unit)
        parts.push(item.name)
        return `- ${parts.join(' ')}`
      })
      .join('\n')

    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      alert('Shopping list copied to clipboard!')
    }).catch(() => {
      // Fallback: show in a textarea for manual copy
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      alert('Shopping list copied to clipboard!')
    })
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading shopping list...</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Shopping List</h1>

      <ShoppingListHeader
        startDate={startDate}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onGenerate={handleGenerate}
        onExport={handleExportText}
        isGenerating={isGenerating}
        hasItems={shoppingList?.items && shoppingList.items.length > 0}
      />

      {!shoppingList || shoppingList.items.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No shopping list for this week yet.
          </p>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate from Meal Plan'}
          </Button>
        </div>
      ) : (
        <>
          <ShoppingListItems
            items={shoppingList.items}
            onToggle={handleToggleItem}
            onDelete={handleDeleteItem}
          />

          {showAddForm ? (
            <AddItemForm
              onAdd={handleAddItem}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <Button
              variant="secondary"
              onClick={() => setShowAddForm(true)}
              className="mt-4"
            >
              + Add Item
            </Button>
          )}
        </>
      )}
    </div>
  )
}
