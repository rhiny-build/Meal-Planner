/**
 * RecipeModal Component
 *
 * Modal wrapper for recipe add/edit form
 */

import type { RecipeWithIngredients, RecipeFormData } from '@/types'
import RecipeForm from '@/components/RecipeForm'

interface RecipeModalProps {
  recipe?: RecipeWithIngredients
  onSubmit: (data: RecipeFormData) => Promise<void>
  onCancel: () => void
}

export default function RecipeModal({ recipe, onSubmit, onCancel }: RecipeModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full my-8">
        <h2 className="text-2xl font-bold mb-4">
          {recipe ? 'Edit Recipe' : 'Add New Recipe'}
        </h2>
        <RecipeForm
          recipe={recipe}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      </div>
    </div>
  )
}
