'use client'

/**
 * Shopping List Client Component
 *
 * Orchestrates shopping list UI by composing the useShoppingList hook
 * with tab-specific content components.
 */

import { useShoppingList } from '../hooks/useShoppingList'
import type { Recipe } from '@/types'
import type { ShoppingList, ShoppingListItem, Category, MasterListItem } from '@prisma/client'
import TabNavigation from './TabNavigation'
import ShoppingListHeader from './ShoppingListHeader'
import ShoppingListItems from './ShoppingListItems'
import ShoppingListTabContent from './ShoppingListTabContent'
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
  const {
    isPending,
    showAddForm,
    setShowAddForm,
    itemToDelete,
    setItemToDelete,
    optimisticItems,
    activeTab,
    currentWeekStart,
    setActiveTab,
    goToPreviousWeek,
    goToNextWeek,
    handleToggle,
    handleAddItem,
    handleAddToMasterList,
    handleExport,
    handleDeleteClick,
    handleMapToExisting,
    handleCreateAndMap,
    handleJustDelete,
    staplesCategories,
    restockCategories,
    includedStapleNames,
    includedRestockNames,
  } = useShoppingList({ initialList, initialWeekStart, initialTab, categories })

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-6">Shopping List</h1>

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

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
        <ShoppingListTabContent
          items={optimisticItems}
          recipes={recipes}
          categories={categories}
          currentWeekStart={currentWeekStart}
          showAddForm={showAddForm}
          isPending={isPending}
          onToggle={handleToggle}
          onDelete={handleDeleteClick}
          onAddItem={handleAddItem}
          onAddToMasterList={handleAddToMasterList}
          onExport={handleExport}
          onShowAddForm={setShowAddForm}
          onPreviousWeek={goToPreviousWeek}
          onNextWeek={goToNextWeek}
        />
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
