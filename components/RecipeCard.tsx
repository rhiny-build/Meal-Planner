/**
 * Recipe Card Component
 *
 * Displays a single recipe in a card format with its key information.
 * Used in the recipe library to show recipes in a grid.
 */

import type { Recipe } from '@/types'
import Button from './Button'

interface RecipeCardProps {
  recipe: Recipe
  onEdit: (recipe: Recipe) => void
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow">
      {/* Recipe Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {recipe.name}
        </h3>
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${tierColors[recipe.tier] || tierColors.favorite}`}
        >
          {formatTier(recipe.tier)}
        </span>
      </div>

      {/* Recipe Details */}
      <div className="space-y-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center">
          <span className="font-medium mr-2">Protein:</span>
          <span className="capitalize">{recipe.proteinType.replace('-', ' ')}</span>
        </div>
        <div className="flex items-center">
          <span className="font-medium mr-2">Carb:</span>
          <span className="capitalize">{recipe.carbType}</span>
        </div>
        <div className="flex items-center">
          <span className="font-medium mr-2">Prep Time:</span>
          <span>{formatPrepTime(recipe.prepTime)}</span>
        </div>
      </div>

      {/* Ingredients Preview */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Ingredients:
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
          {recipe.ingredients}
        </p>
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
