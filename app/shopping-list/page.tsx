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

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useShoppingList } from '@/lib/hooks/useShoppingList'
import { formatShoppingListAsText } from '@/lib/shoppingListHelpers'
import type { Recipe } from '@/types'
import Button from '@/components/Button'
import ShoppingListHeader from './components/ShoppingListHeader'
import ShoppingListItems from './components/ShoppingListItems'
import AddItemForm from './components/AddItemForm'

export default function ShoppingListPage() {
  const searchParams = useSearchParams()
  const weekParam = searchParams.get('week')
  const initialWeek = weekParam ? new Date(weekParam) : undefined

  const {
    startDate,
    shoppingList,
    isLoading,
    isGenerating,
    goToPreviousWeek,
    goToNextWeek,
    generateList,
    toggleItem,
    addItem,
  } = useShoppingList(initialWeek)

  const [recipes, setRecipes] = useState<Recipe[]>([])

  // Fetch recipes for linking
  useEffect(() => {
    fetch('/api/recipes')
      .then(res => res.json())
      .then(data => setRecipes(data))
      .catch(err => console.error('Error fetching recipes:', err))
  }, [])

  const [showAddForm, setShowAddForm] = useState(false)

  const handleAddItem = async (name: string) => {
    const success = await addItem(name)
    if (success) {
      setShowAddForm(false)
    }
  }

  const handleExportText = () => {
    if (!shoppingList || shoppingList.items.length === 0) {
      alert('No items to export')
      return
    }

    const text = formatShoppingListAsText(shoppingList.items)

    navigator.clipboard.writeText(text).then(() => {
      alert('Shopping list copied to clipboard!')
    }).catch(() => {
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
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        onGenerate={generateList}
        onExport={handleExportText}
        isGenerating={isGenerating}
        hasItems={shoppingList?.items && shoppingList.items.length > 0}
      />

      {!shoppingList || shoppingList.items.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No shopping list for this week yet.
          </p>
          <Button onClick={generateList} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate from Meal Plan'}
          </Button>
        </div>
      ) : (
        <>
          <ShoppingListItems
            items={shoppingList.items}
            recipes={recipes}
            onToggle={toggleItem}
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
