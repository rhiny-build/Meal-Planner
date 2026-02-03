'use client'

/**
 * Shopping List Client Component
 *
 * Manages shopping list state and UI interactions.
 * Receives initial data from server component, uses server actions for mutations.
 */

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { getMonday } from '@/lib/dateUtils'
import { formatShoppingListAsText } from '@/lib/shoppingListHelpers'
import { generateShoppingList, toggleItem, addItem } from '../actions'
import type { Recipe } from '@/types'
import type { ShoppingList, ShoppingListItem } from '@prisma/client'
import Button from '@/components/Button'
import ShoppingListHeader from './ShoppingListHeader'
import ShoppingListItems from './ShoppingListItems'
import AddItemForm from './AddItemForm'

type ShoppingListWithItems = ShoppingList & { items: ShoppingListItem[] }

interface ShoppingListClientProps {
  initialList: ShoppingListWithItems | null
  initialWeekStart: Date
  recipes: Recipe[]
}

export default function ShoppingListClient({
  initialList,
  initialWeekStart,
  recipes,
}: ShoppingListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  // Current week is derived from URL or initial props
  const weekParam = searchParams.get('week')
  const currentWeekStart = weekParam ? getMonday(new Date(weekParam)) : initialWeekStart

  const navigateToWeek = (date: Date) => {
    const isoDate = date.toISOString().split('T')[0]
    router.push(`/shopping-list?week=${isoDate}`)
  }

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() - 7)
    navigateToWeek(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() + 7)
    navigateToWeek(newDate)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      await generateShoppingList(currentWeekStart)
      toast.success('Shopping list generated!')
    } catch (error) {
      console.error('Error generating shopping list:', error)
      toast.error('Failed to generate shopping list')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleToggle = (itemId: string, checked: boolean) => {
    startTransition(async () => {
      try {
        await toggleItem(itemId, checked)
      } catch (error) {
        console.error('Error toggling item:', error)
        toast.error('Failed to update item')
      }
    })
  }

  const handleAddItem = async (name: string) => {
    if (!initialList) return

    startTransition(async () => {
      try {
        await addItem(initialList.id, name)
        setShowAddForm(false)
        toast.success('Item added!')
      } catch (error) {
        console.error('Error adding item:', error)
        toast.error('Failed to add item')
      }
    })
  }

  const handleExport = () => {
    if (!initialList || initialList.items.length === 0) {
      toast.warning('No items to export')
      return
    }

    const text = formatShoppingListAsText(initialList.items)

    navigator.clipboard.writeText(text).then(() => {
      toast.success('Shopping list copied to clipboard!')
    }).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      toast.success('Shopping list copied to clipboard!')
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Shopping List</h1>

      <ShoppingListHeader
        startDate={currentWeekStart}
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        onGenerate={handleGenerate}
        onExport={handleExport}
        isGenerating={isGenerating}
        hasItems={initialList?.items && initialList.items.length > 0}
      />

      {!initialList || initialList.items.length === 0 ? (
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
            items={initialList.items}
            recipes={recipes}
            onToggle={handleToggle}
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
              disabled={isPending}
            >
              + Add Item
            </Button>
          )}
        </>
      )}
    </div>
  )
}
