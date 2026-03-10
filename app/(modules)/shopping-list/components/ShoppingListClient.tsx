'use client'

/**
 * Shopping List Client Component
 *
 * Manages shopping list state and UI interactions.
 * Receives initial data from server component, uses server actions for mutations.
 */

import { useState, useTransition, useOptimistic } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { getMonday } from '@/lib/dateUtils'
import { formatShoppingListAsText } from '@/lib/shoppingListHelpers'
import { toggleItem, addItem, deleteShoppingListItem } from '../actions'
import { createIngredientMapping } from '../ingredientMappingActions'
import { addMasterListItem } from '../masterListActions'
import type { Recipe } from '@/types'
import type { ShoppingList, ShoppingListItem, Category, MasterListItem } from '@prisma/client'
import Button from '@/components/Button'
import ShoppingListHeader from './ShoppingListHeader'
import ShoppingListItems from './ShoppingListItems'
import AddItemForm from './AddItemForm'
import MasterListTab from './MasterListTab'
import DeleteItemModal from './DeleteItemModal'

type ShoppingListWithItems = ShoppingList & { items: ShoppingListItem[] }
type CategoryWithItems = Category & { items: MasterListItem[] }
type Tab = 'meals' | 'staples' | 'restock' | 'list'

interface ShoppingListClientProps {
  initialList: ShoppingListWithItems
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
  const [showAddForm, setShowAddForm] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ShoppingListItem | null>(null)

  // OPTIMISTIC UPDATES: Instead of reading items directly from server props
  // (initialList.items), we maintain a local "optimistic" copy via useOptimistic.
  // When the user toggles a checkbox, we update this copy instantly — no waiting
  // for the server. Here's the lifecycle:
  //
  //   1. User clicks checkbox → setOptimisticItem() → UI updates immediately
  //   2. Server action runs in the background (toggleItem + revalidatePath)
  //   3. Server responds with fresh data → initialList.items updates →
  //      useOptimistic automatically switches from optimistic → real state
  //   4. Since both match (the toggle succeeded), the user sees no flash
  //   5. If the server action FAILS, React reverts to the real state (pre-toggle)
  //
  // The second argument is a reducer: given the current items and an update,
  // it returns a new array with just that one item's `checked` field flipped.
  const [optimisticItems, setOptimisticItem] = useOptimistic(
    initialList.items,
    (currentItems: ShoppingListItem[], update: { id: string; checked: boolean }) =>
      currentItems.map(item =>
        item.id === update.id ? { ...item, checked: update.checked } : item
      )
  )

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

  const handleToggle = (itemId: string, checked: boolean) => {
    startTransition(async () => {
      // Update UI immediately — the user sees the checkbox flip right away.
      // This must be inside startTransition so React knows it's optimistic.
      setOptimisticItem({ id: itemId, checked })
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

  const handleAddToMasterList = (name: string, type: 'staple' | 'restock', categoryId: string) => {
    if (!initialList) return

    startTransition(async () => {
      try {
        await addMasterListItem(categoryId, name, type)
        await addItem(initialList.id, name)
        setShowAddForm(false)
        toast.success(`Added to shopping list and saved as ${type}!`)
      } catch (error) {
        console.error('Error adding item to master list:', error)
        toast.error('Failed to add item')
      }
    })
  }

  const handleExport = () => {
    if (!initialList || optimisticItems.length === 0) {
      toast.warning('No items to export')
      return
    }

    const text = formatShoppingListAsText(optimisticItems)

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

  const handleDeleteClick = (item: ShoppingListItem) => {
    setItemToDelete(item)
  }

  const handleMapToExisting = (masterItemId: string) => {
    if (!itemToDelete) return
    const name = itemToDelete.name
    const id = itemToDelete.id
    startTransition(async () => {
      try {
        await createIngredientMapping(name, masterItemId)
        await deleteShoppingListItem(id)
        setItemToDelete(null)
        toast.success('Mapped and removed!')
      } catch (error) {
        console.error('Error mapping item:', error)
        toast.error('Failed to map item')
      }
    })
  }

  const handleCreateAndMap = (name: string, type: 'staple' | 'restock', categoryId: string) => {
    if (!itemToDelete) return
    const recipeName = itemToDelete.name
    const itemId = itemToDelete.id
    startTransition(async () => {
      try {
        const newItem = await addMasterListItem(categoryId, name, type)
        await createIngredientMapping(recipeName, newItem.id)
        await deleteShoppingListItem(itemId)
        setItemToDelete(null)
        toast.success('Added to master list and mapped!')
      } catch (error) {
        console.error('Error creating and mapping item:', error)
        toast.error('Failed to create item')
      }
    })
  }

  const handleJustDelete = () => {
    if (!itemToDelete) return
    const id = itemToDelete.id
    startTransition(async () => {
      try {
        await deleteShoppingListItem(id)
        setItemToDelete(null)
        toast.success('Item removed')
      } catch (error) {
        console.error('Error deleting item:', error)
        toast.error('Failed to delete item')
      }
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
    optimisticItems
      .filter(item => item.source === 'staple')
      .map(item => item.name)
  )
  const includedRestockNames = new Set(
    optimisticItems
      .filter(item => item.source === 'restock')
      .map(item => item.name)
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
          />

          {(() => {
            const mealItems = optimisticItems.filter(item => item.source === 'recipe')
            if (mealItems.length === 0) {
              return (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400">
                    No meal ingredients yet. Save a meal plan to see ingredients here.
                  </p>
                </div>
              )
            }
            return (
              <ShoppingListItems
                items={mealItems}
                recipes={recipes}
                onToggle={handleToggle}
                onDelete={handleDeleteClick}
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
            onExport={handleExport}
            hasItems={optimisticItems.length > 0}
          />

          {optimisticItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400">
                No items yet. Save a meal plan or customise your staples and restock items.
              </p>
            </div>
          ) : (
            <>
              {(() => {
                const recipeItems = optimisticItems.filter(i => i.source === 'recipe')
                const masterItems = optimisticItems.filter(i => i.source === 'staple' || i.source === 'restock')
                const manualItems = optimisticItems.filter(i => i.source === 'manual')
                return (
                  <>
                    {recipeItems.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                          <span className="text-lg">🍽</span>
                          Meal Plan Ingredients
                          <span className="text-xs font-normal bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                            {recipeItems.length}
                          </span>
                        </h2>
                        <ShoppingListItems
                          items={recipeItems}
                          recipes={recipes}
                          onToggle={handleToggle}
                          onDelete={handleDeleteClick}
                        />
                      </div>
                    )}
                    {masterItems.length > 0 && (
                      <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                          <span className="text-lg">📋</span>
                          Master List Items
                          <span className="text-xs font-normal bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                            {masterItems.length}
                          </span>
                        </h2>
                        <ShoppingListItems
                          items={masterItems}
                          recipes={recipes}
                          onToggle={handleToggle}
                        />
                      </div>
                    )}
                    {manualItems.length > 0 && (
                      <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                          <span className="text-lg">✏️</span>
                          Manual Items
                          <span className="text-xs font-normal bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                            {manualItems.length}
                          </span>
                        </h2>
                        <ShoppingListItems
                          items={manualItems}
                          recipes={recipes}
                          onToggle={handleToggle}
                        />
                      </div>
                    )}
                  </>
                )
              })()}

              {showAddForm ? (
                <AddItemForm
                  onAdd={handleAddItem}
                  onAddToMasterList={handleAddToMasterList}
                  onCancel={() => setShowAddForm(false)}
                  categories={categories}
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
        />
      )}

      {itemToDelete && (
        <DeleteItemModal
          item={itemToDelete}
          categories={categories}
          onMapToExisting={handleMapToExisting}
          onCreateAndMap={handleCreateAndMap}
          onJustDelete={handleJustDelete}
          onClose={() => setItemToDelete(null)}
          isPending={isPending}
        />
      )}
    </div>
  )
}
