'use client'

import type { Recipe } from '@/types'
import type { ShoppingListItem, Category, MasterListItem } from '@prisma/client'
import Button from '@/components/Button'
import ShoppingListHeader from './ShoppingListHeader'
import ShoppingListItems from './ShoppingListItems'
import AddItemForm from './AddItemForm'

type CategoryWithItems = Category & { items: MasterListItem[] }

interface ItemSectionProps {
  emoji: string
  title: string
  items: ShoppingListItem[]
  badgeColor: string
  recipes: Recipe[]
  onToggle: (id: string, checked: boolean) => void
  onDelete?: (item: ShoppingListItem) => void
  className?: string
}

function ItemSection({ emoji, title, items, badgeColor, recipes, onToggle, onDelete, className = '' }: ItemSectionProps) {
  return (
    <div className={`bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 ${className}`}>
      <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        {title}
        <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${badgeColor}`}>
          {items.length}
        </span>
      </h2>
      <ShoppingListItems
        items={items}
        recipes={recipes}
        onToggle={onToggle}
        onDelete={onDelete}
      />
    </div>
  )
}

interface ShoppingListTabContentProps {
  items: ShoppingListItem[]
  recipes: Recipe[]
  categories: CategoryWithItems[]
  currentWeekStart: Date
  showAddForm: boolean
  isPending: boolean
  onToggle: (id: string, checked: boolean) => void
  onDelete: (item: ShoppingListItem) => void
  onAddItem: (name: string) => void
  onAddToMasterList: (name: string, type: 'staple' | 'restock', categoryId: string) => void
  onExport: () => void
  onShowAddForm: (show: boolean) => void
  onPreviousWeek: () => void
  onNextWeek: () => void
}

export default function ShoppingListTabContent({
  items,
  recipes,
  categories,
  currentWeekStart,
  showAddForm,
  isPending,
  onToggle,
  onDelete,
  onAddItem,
  onAddToMasterList,
  onExport,
  onShowAddForm,
  onPreviousWeek,
  onNextWeek,
}: ShoppingListTabContentProps) {
  const recipeItems = items.filter(i => i.source === 'recipe')
  const masterItems = items.filter(i => i.source === 'staple' || i.source === 'restock')
  const manualItems = items.filter(i => i.source === 'manual')

  return (
    <>
      <ShoppingListHeader
        startDate={currentWeekStart}
        onPreviousWeek={onPreviousWeek}
        onNextWeek={onNextWeek}
        onExport={onExport}
        hasItems={items.length > 0}
      />

      {items.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">
            No items yet. Save a meal plan or customise your staples and restock items.
          </p>
        </div>
      ) : (
        <>
          {recipeItems.length > 0 && (
            <ItemSection
              emoji="🍽"
              title="Meal Plan Ingredients"
              items={recipeItems}
              badgeColor="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
              recipes={recipes}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          )}
          {masterItems.length > 0 && (
            <ItemSection
              emoji="📋"
              title="Master List Items"
              items={masterItems}
              badgeColor="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
              recipes={recipes}
              onToggle={onToggle}
              className="mt-6"
            />
          )}
          {manualItems.length > 0 && (
            <ItemSection
              emoji="✏️"
              title="Manual Items"
              items={manualItems}
              badgeColor="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              recipes={recipes}
              onToggle={onToggle}
              className="mt-6"
            />
          )}

          {showAddForm ? (
            <AddItemForm
              onAdd={onAddItem}
              onAddToMasterList={onAddToMasterList}
              onCancel={() => onShowAddForm(false)}
              categories={categories}
            />
          ) : (
            <Button
              variant="secondary"
              onClick={() => onShowAddForm(true)}
              className="mt-4"
              disabled={isPending}
            >
              + Add Item
            </Button>
          )}
        </>
      )}
    </>
  )
}
