/**
 * Shopping List Items Component
 *
 * Displays the list of items with checkboxes to mark as purchased
 */

'use client'

import type { ShoppingListItem, Recipe } from '@/types'

interface ShoppingListItemsProps {
  items: ShoppingListItem[]
  recipes: Recipe[]
  onToggle: (itemId: string, checked: boolean) => void
}

// Parse notes "For: Recipe1, Recipe2 [base: ingredient]" into recipe names and debug info
function parseRecipeNames(notes: string | null): string[] {
  if (!notes || !notes.startsWith('For: ')) return []
  const cleaned = notes.replace(/\s*\[base:.*\]$/, '')
  return cleaned.slice(5).split(', ').map(name => name.trim())
}

// DEBUG: extract base ingredient from notes for visibility
function parseDebugBase(notes: string | null): string | null {
  if (!notes) return null
  const match = notes.match(/\[base: (.+)\]$/)
  return match ? match[1] : null
}

export default function ShoppingListItems({
  items,
  recipes,
  onToggle,
}: ShoppingListItemsProps) {
  const uncheckedItems = items.filter((item) => !item.checked)
  const checkedItems = items.filter((item) => item.checked)

  // Create a map of recipe names to recipes for quick lookup
  const recipeNameToRecipe = new Map<string, Recipe>()
  recipes.forEach(recipe => {
    recipeNameToRecipe.set(recipe.name.toLowerCase(), recipe)
  })

  const RecipeLink = ({ name }: { name: string }) => {
    const recipe = recipeNameToRecipe.get(name.toLowerCase())
    if (recipe) {
      // Link to external URL if available, otherwise to recipes page
      const href = recipe.recipeUrl || `/recipes?highlight=${recipe.id}`
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {name}
        </a>
      )
    }
    return <span>{name}</span>
  }

  const ItemRow = ({ item }: { item: ShoppingListItem }) => {
    const recipeNames = parseRecipeNames(item.notes)
    const debugBase = parseDebugBase(item.notes)

    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-lg border dark:border-gray-700 transition-colors ${
          item.checked
            ? 'bg-gray-100 dark:bg-gray-800 opacity-60'
            : 'bg-white dark:bg-gray-900'
        }`}
      >
        <input
          type="checkbox"
          checked={item.checked}
          onChange={(e) => onToggle(item.id, e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
        />
        <div className="flex-1">
          <span className={item.checked ? 'line-through text-gray-500' : ''}>
            {item.name}
          </span>
          {debugBase && (
            <span className="text-xs ml-2" style={{ color: '#ec4899' }}>
              [{debugBase}]
            </span>
          )}
          {recipeNames.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              For: {recipeNames.map((name, i) => (
                <span key={name}>
                  {i > 0 && ', '}
                  <RecipeLink name={name} />
                </span>
              ))}
            </p>
          )}
          {item.source === 'manual' && (
            <span className="text-xs text-blue-500 ml-2">(added manually)</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {uncheckedItems.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            To Buy ({uncheckedItems.length})
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            Check the box to mark as purchased
          </p>
          <div className="space-y-2">
            {uncheckedItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {checkedItems.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Got It ({checkedItems.length})
          </h2>
          <div className="space-y-2">
            {checkedItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
