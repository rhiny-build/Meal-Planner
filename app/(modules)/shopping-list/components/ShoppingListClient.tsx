'use client'

/**
 * Shopping List Client Component
 *
 * Orchestrates the shopping list page: tab navigation, tab content,
 * and modals. State and handlers live in useShoppingList hook.
 */

import { useShoppingList } from '../hooks/useShoppingList'
import type { Tab } from '../hooks/useShoppingList'
import type { Recipe } from '@/types'
import type { ShoppingList, ShoppingListItem, Category, MasterListItem } from '@prisma/client'
import Button from '@/components/Button'
import TabNavigation from './TabNavigation'
import ShoppingListHeader from './ShoppingListHeader'
import ShoppingListItems from './ShoppingListItems'
import ShoppingListTabContent from './ShoppingListTabContent'
import MasterListTab from './MasterListTab'
import DeleteItemModal from './DeleteItemModal'
import EmbeddingReviewModal from './EmbeddingReviewModal'
import StaleBanner from './StaleBanner'

type ShoppingListWithItems = ShoppingList & { items: ShoppingListItem[] }
type CategoryWithItems = Category & { items: MasterListItem[] }

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
    isGenerating,
    showAddForm,
    setShowAddForm,
    itemToDelete,
    pendingSuggestions,
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
    handleGenerateList,
    handleReviewComplete,
    allMasterItems,
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

          {initialList.stale && (
            <StaleBanner onRegenerate={handleGenerateList} isPending={isGenerating} />
          )}

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

          <Button
            onClick={handleGenerateList}
            disabled={isGenerating || isPending}
            className="mt-4"
          >
            {isGenerating ? 'Generating...' : 'Generate Shopping List'}
          </Button>
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

          {initialList.stale && (
            <StaleBanner onRegenerate={handleGenerateList} isPending={isGenerating} />
          )}

          <ShoppingListTabContent
            items={optimisticItems}
            recipes={recipes}
            categories={categories}
            isPending={isPending}
            isGenerating={isGenerating}
            showAddForm={showAddForm}
            onToggle={handleToggle}
            onDelete={handleDeleteClick}
            onAddItem={handleAddItem}
            onAddToMasterList={handleAddToMasterList}
            onGenerateList={handleGenerateList}
            onShowAddForm={setShowAddForm}
          />
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

      {pendingSuggestions && pendingSuggestions.length > 0 && (
        <EmbeddingReviewModal
          suggestions={pendingSuggestions}
          masterItems={allMasterItems}
          onComplete={handleReviewComplete}
        />
      )}
    </div>
  )
}
