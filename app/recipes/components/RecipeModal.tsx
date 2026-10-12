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
    // The overlay is the scroll container. The card sits in a wrapper that is at least as tall
    // as the screen and is NOT vertically centred by the scroll container itself: centring a
    // taller-than-screen child inside an overflow container pushes its top out of reach.
    <div
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black bg-opacity-50"
      data-testid="recipe-modal-scroll"
    >
      <div className="flex min-h-full items-start justify-center p-2 sm:items-center sm:p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 max-w-2xl w-full">
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
    </div>
  )
}
