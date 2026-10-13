/**
 * CookIngredientList
 *
 * The recipe's ingredients with amounts scaled to the chosen servings.
 * Ingredients with only free-text quantities are shown as written, and
 * marked "not scaled" when servings differ from the recipe's.
 */

import { describeIngredient } from '@/lib/recipeStepTokens'
import { isScalableIngredient } from '@/lib/cook/scaleServings'
import type { CookIngredientData } from './cookTypes'

interface CookIngredientListProps {
  ingredients: CookIngredientData[]
  scale: number
}

export default function CookIngredientList({ ingredients, scale }: CookIngredientListProps) {
  return (
    <ul className="space-y-2 text-lg" data-testid="cook-ingredient-list">
      {ingredients.map((ingredient) => {
        const isUnscaled = scale !== 1 && !isScalableIngredient(ingredient) && !!ingredient.quantity
        return (
          <li key={ingredient.id} className="flex flex-wrap items-baseline gap-x-2">
            <span>{describeIngredient(ingredient, scale)}</span>
            {ingredient.notes && (
              <span className="text-gray-500 dark:text-neutral-400">({ingredient.notes})</span>
            )}
            {isUnscaled && (
              <span className="text-sm text-amber-700 dark:text-amber-300">not scaled</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
