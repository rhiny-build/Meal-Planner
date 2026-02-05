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
import type { ShoppingList, ShoppingListItem, Category, MasterListItem } from '@prisma/client'
import Button from '@/components/Button'
import ShoppingListHeader from './ShoppingListHeader'
import ShoppingListItems from './ShoppingListItems'
import AddItemForm from './AddItemForm'
import MasterListTab from './MasterListTab'

type ShoppingListWithItems = ShoppingList & { items: ShoppingListItem[] }
type CategoryWithItems = Category & { items: MasterListItem[] }
type Tab = 'meals' | 'staples' | 'restock' | 'list'

interface ShoppingListClientProps {
  initialList: ShoppingListWithItems | null
  initialWeekStart: Date
  initialTab?: Tab
  recipes: Recipe[]
  categories: CategoryWithItems[]
}

export default function ShoppingListClient({
  initialList,
  initialWeekStart,
  initialTab = 'meals',
  recipes,
  categories,
}: ShoppingListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  // Current tab is derived from URL or initial props
  const tabParam = searchParams.get('tab') as Tab | null
  const activeTab = tabParam || initialTab

  // Current week is derived from URL or initial props
  const weekParam = searchParams.get('week')
  const currentWeekStart = weekParam ? getMonday(new Date(weekParam)) : initialWeekStart

  const setActiveTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'meals') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    router.push(`/shopping-list?${params.toString()}`)
  }

  const navigateToWeek = (date: Date) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('week', date.toISOString().split('T')[0])
    router.push(`/shopping-list?${params.toString()}`)
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

  // Filter categories by item type for staples/restock tabs
  const staplesCategories = categories
    .map(cat => ({
      ...cat,
      items: cat.items.filter(item => item.type === 'staple'),
    }))
    .filter(cat => cat.items.length > 0)

  const restockCategories = categories
    .map(cat => ({
      ...cat,
      items: cat.items.filter(item => item.type === 'restock'),
    }))
    .filter(cat => cat.items.length > 0)

  // Get sets of item names that are in the current shopping list by source
  const includedStapleNames = new Set(
    initialList?.items
      .filter(item => item.source === 'staple')
      .map(item => item.name) ?? []
  )
  const includedRestockNames = new Set(
    initialList?.items
      .filter(item => item.source === 'restock')
      .map(item => item.name) ?? []
  )

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-6">Shopping List</h1>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('meals')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'meals'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          This Week&apos;s Meals
        </button>
        <button
          onClick={() => setActiveTab('staples')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'staples'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Staples
        </button>
        <button
          onClick={() => setActiveTab('restock')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'restock'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Restock
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'list'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Shopping List
        </button>
      </div>

      {/* This Week's Meals Tab */}
      {activeTab === 'meals' && (
        <>
          <ShoppingListHeader
            startDate={currentWeekStart}
            onPreviousWeek={goToPreviousWeek}
            onNextWeek={goToNextWeek}
            isGenerating={isGenerating}
          />

          {(() => {
            const mealItems = initialList?.items.filter(item => item.source === 'meal') ?? []
            if (mealItems.length === 0) {
              return (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400">
                    No meal ingredients yet. Generate a shopping list from the Shopping List tab.
                  </p>
                </div>
              )
            }
            return (
              <ShoppingListItems
                items={mealItems}
                recipes={recipes}
                onToggle={handleToggle}
              />
            )
          })()}
        </>
      )}

      {/* Shopping List Tab */}
      {activeTab === 'list' && (
        <>
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
        </>
      )}

      {/* Staples Tab */}
      {activeTab === 'staples' && (
        <MasterListTab
          type="staple"
          categories={staplesCategories}
          description="Items bought every week. Uncheck items you don't need this week."
          weekStart={currentWeekStart}
          includedItemNames={includedStapleNames}
          listExists={initialList !== null}
        />
      )}

      {/* Restock Tab */}
      {activeTab === 'restock' && (
        <MasterListTab
          type="restock"
          categories={restockCategories}
          description="Household items to restock as needed. Check items you need this week."
          weekStart={currentWeekStart}
          includedItemNames={includedRestockNames}
          listExists={initialList !== null}
        />
      )}
    </div>
  )
}
