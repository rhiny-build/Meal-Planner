'use client'

/**
 * Shopping List Tab Content
 *
 * Renders the combined "Shopping List" tab — all items grouped by source
 * (recipe, master list, manual) with add-item form and generate button.
 */

import type { ShoppingListItem, Category, MasterListItem } from '@prisma/client'
import type { Recipe } from '@/types'
import Button from '@/components/Button'
import ShoppingListItems from './ShoppingListItems'
import AddItemForm from './AddItemForm'

type CategoryWithItems = Category & { items: MasterListItem[] }

interface ShoppingListTabContentProps {
  items: ShoppingListItem[]
  recipes: Recipe[]
  categories: CategoryWithItems[]
  isPending: boolean
  isGenerating: boolean
  showAddForm: boolean
  onToggle: (itemId: string, checked: boolean) => void
  onDelete: (item: ShoppingListItem) => void
  onAddItem: (name: string) => void
  onAddToMasterList: (name: string, type: 'staple' | 'restock', categoryId: string) => void
  onGenerateList: () => void
  onShowAddForm: (show: boolean) => void
}

export default function ShoppingListTabContent({
  items,
  recipes,
  categories,
  isPending,
  isGenerating,
  showAddForm,
  onToggle,
  onDelete,
  onAddItem,
  onAddToMasterList,
  onGenerateList,
  onShowAddForm,
}: ShoppingListTabContentProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-600 dark:text-gray-400">
          No items yet. Save a meal plan or customise your staples and restock items.
        </p>
      </div>
    )
  }

  const recipeItems = items.filter(i => i.source === 'recipe')
  const masterItems = items.filter(i => i.source === 'staple' || i.source === 'restock')
  const manualItems = items.filter(i => i.source === 'manual')

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
            onToggle={onToggle}
            onDelete={onDelete}
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
            onToggle={onToggle}
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
            onToggle={onToggle}
          />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {showAddForm ? (
          <AddItemForm
            onAdd={onAddItem}
            onAddToMasterList={onAddToMasterList}
            onCancel={() => onShowAddForm(false)}
            categories={categories}
          />
        ) : (
          <>
            <Button
              variant="secondary"
              onClick={() => onShowAddForm(true)}
              disabled={isPending}
            >
              + Add Item
            </Button>
            <Button
              onClick={onGenerateList}
              disabled={isGenerating || isPending}
            >
              {isGenerating ? 'Generating...' : 'Generate Shopping List'}
            </Button>
          </>
        )}
      </div>
    </>
  )
}
