/**
 * Recipe Card Component
 *
 * Displays a single recipe in a card format with its key information.
 * Used in the recipe library to show recipes in a grid.
 */

import Link from 'next/link'
import type { RecipeWithIngredients } from '@/types'
import Button from './Button'
import { formatIngredient } from '@/lib/ingredientHelpers'

interface RecipeCardProps {
  recipe: RecipeWithIngredients
  onEdit: (recipe: RecipeWithIngredients) => void
  onDelete: (id: string) => void
}

export default function RecipeCard({
  recipe,
  onEdit,
  onDelete,
}: RecipeCardProps) {
  // Helper function to format the tier for display
  const formatTier = (tier: string) => {
    const tierMap: Record<string, string> = {
      favorite: 'Favorite',
      'non-regular': 'Non-Regular',
      new: 'New',
    }
    return tierMap[tier] || tier
  }

  // Helper function to format prep time
  const formatPrepTime = (prepTime: string) => {
    const prepMap: Record<string, string> = {
      quick: 'Quick (<30min)',
      medium: 'Medium (30-60min)',
      long: 'Long (>60min)',
    }
    return prepMap[prepTime] || prepTime
  }

  // Color coding for tier badges
  const tierColors: Record<string, string> = {
    favorite: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'non-regular':
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  }

  const stepCount = recipe.steps?.length ?? 0
  const ingredientCount = recipe.structuredIngredients?.length ?? 0

  // Quick items (a quick side or main) get a compact card: no ingredient preview.
  if (recipe.kind === 'quick') {
    return (
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md px-4 py-3 hover:shadow-lg transition-shadow border-l-4 border-amber-400"
        data-testid="recipe-card"
        data-kind="quick"
      >
        <div className="flex justify-between items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            <Link href={`/recipes/${recipe.id}`} className="hover:underline">
              {recipe.name}
            </Link>
          </h3>
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            Quick
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {[
            recipe.proteinType && recipe.proteinType.replace('-', ' '),
            recipe.carbType,
            ingredientCount > 0 && `${ingredientCount} ${ingredientCount === 1 ? "ingredient" : "ingredients"}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="secondary" onClick={() => onEdit(recipe)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => onDelete(recipe.id)}>
            Delete
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow"
      data-testid="recipe-card"
      data-kind="full"
    >
      {/* Recipe Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          <Link href={`/recipes/${recipe.id}`} className="hover:underline">
            {recipe.name}
          </Link>
        </h3>
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${tierColors[recipe.tier] || tierColors.favorite}`}
        >
          {formatTier(recipe.tier)}
        </span>
      </div>
      {stepCount > 0 && (
        <p
          className="text-xs font-medium text-blue-700 dark:text-fuchsia-300 mb-2"
          data-testid="method-indicator"
        >
          Method · {stepCount} {stepCount === 1 ? 'step' : 'steps'}
        </p>
      )}

      {/* Recipe Details */}
      <div className="space-y-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
        {recipe.recipeUrl && (
          <div className="flex items-center">
            <span className="font-medium mr-2">URL:</span>
            <a href={recipe.recipeUrl} target="_blank" className="text-blue-600 hover:underline">View Recipe</a>
          </div>
        )}
        {recipe.proteinType && (
          <div className="flex items-center">
            <span className="font-medium mr-2">Protein:</span>
            <span className="capitalize">{recipe.proteinType.replace('-', ' ')}</span>
          </div>
        )}
        {recipe.carbType && (
          <div className="flex items-center">
            <span className="font-medium mr-2">Carb:</span>
            <span className="capitalize">{recipe.carbType}</span>
          </div>
        )}
        {recipe.vegetableType && (
          <div className="flex items-center">
            <span className="font-medium mr-2">Vegetable:</span>
            <span className="capitalize">Yes</span>
          </div>
        )}
        {recipe.prepTime && (
          <div className="flex items-center">
            <span className="font-medium mr-2">Prep Time:</span>
            <span>{formatPrepTime(recipe.prepTime)}</span>
          </div>
        )}
      </div>

      {/* Ingredients Preview */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Ingredients:
        </p>
        {recipe.structuredIngredients && recipe.structuredIngredients.length > 0 ? (
          <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-0.5">
            {recipe.structuredIngredients.slice(0, 5).map((ing) => (
              <li key={ing.id} className="truncate">
                {formatIngredient(ing)}
              </li>
            ))}
            {recipe.structuredIngredients.length > 5 && (
              <li className="text-gray-400">+{recipe.structuredIngredients.length - 5} more</li>
            )}
          </ul>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
            {recipe.ingredients}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => onEdit(recipe)}>
          Edit
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => onDelete(recipe.id)}
        >
          Delete
        </Button>
      </div>
    </div>
  )
}
