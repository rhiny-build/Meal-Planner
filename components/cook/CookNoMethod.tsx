/**
 * CookNoMethod
 *
 * Cook screen body for a full recipe with no method: the ingredients, a
 * quiet note, and the (S09) capture slot.
 */

import CookIngredientList from './CookIngredientList'
import CookCaptureSlot from './CookCaptureSlot'
import type { CookRecipeData } from './cookTypes'

interface CookNoMethodProps {
  recipe: CookRecipeData
  servings: number
  scale: number
}

export default function CookNoMethod({ recipe, servings, scale }: CookNoMethodProps) {
  return (
    <section className="flex-1 overflow-y-auto px-5 py-6 md:px-10" data-testid="cook-no-method">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold mb-4">Ingredients</h2>
        <CookIngredientList ingredients={recipe.ingredients} scale={scale} />
        <p
          className="mt-8 text-gray-600 dark:text-neutral-400"
          data-testid="no-method-note"
        >
          There&apos;s no method for this recipe yet.
        </p>
        <CookCaptureSlot recipe={recipe} servings={servings} />
      </div>
    </section>
  )
}
