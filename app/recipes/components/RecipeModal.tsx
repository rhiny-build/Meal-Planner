/**
 * RecipeModal Component
 *
 * Modal wrapper for recipe add/edit form
 */

import type { RecipeWithIngredients, RecipeFormData } from '@/types'
import type { DishTypeOption } from '@/lib/dishTypeConfig'
import RecipeEditor from '@/components/recipe/RecipeEditor'

interface RecipeModalProps {
  recipe?: RecipeWithIngredients
  onSubmit: (data: RecipeFormData) => Promise<void>
  onCancel: () => void
  proteinOptions: DishTypeOption[]
  carbOptions: DishTypeOption[]
}

export default function RecipeModal({
  recipe,
  onSubmit,
  onCancel,
  proteinOptions,
  carbOptions,
}: RecipeModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 max-w-2xl w-full my-4 sm:my-8">
        <h2 className="text-2xl font-bold mb-4">
          {recipe ? 'Edit Recipe' : 'Add New Recipe'}
        </h2>
        <RecipeEditor
          recipe={recipe}
          onSubmit={onSubmit}
          onCancel={onCancel}
          proteinOptions={proteinOptions}
          carbOptions={carbOptions}
        />
      </div>
    </div>
  )
}
