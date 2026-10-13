/**
 * IngredientsSheet
 *
 * The ingredient list in a sheet that slides up from the bottom (centred
 * card on wide screens). One tap on Ingredients opens it, one tap closes.
 */

import CookIngredientList from './CookIngredientList'
import type { CookIngredientData } from './cookTypes'

interface IngredientsSheetProps {
  ingredients: CookIngredientData[]
  scale: number
  servings: number
  onClose: () => void
}

export default function IngredientsSheet({
  ingredients,
  scale,
  servings,
  onClose,
}: IngredientsSheetProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50"
      onClick={onClose}
      data-testid="ingredients-sheet-backdrop"
    >
      <div
        role="dialog"
        aria-label="Ingredients"
        className="w-full md:max-w-lg max-h-[80vh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-white dark:bg-neutral-900 p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        data-testid="ingredients-sheet"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Ingredients · {servings} servings</h2>
          <button
            type="button"
            className="min-h-11 px-4 rounded-xl bg-gray-200 dark:bg-neutral-700 font-semibold"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        {ingredients.length > 0 ? (
          <CookIngredientList ingredients={ingredients} scale={scale} />
        ) : (
          <p className="text-gray-600 dark:text-neutral-400">No ingredients listed.</p>
        )}
      </div>
    </div>
  )
}
