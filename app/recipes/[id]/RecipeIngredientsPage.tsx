/**
 * RecipeIngredientsPage
 *
 * Second page of the recipe: the servings control (cook mode's scaling) and
 * the ingredients scaled to the chosen servings.
 */

import ServingsControl from '@/components/cook/ServingsControl'
import CookIngredientList from '@/components/cook/CookIngredientList'
import { getServingsScale } from '@/lib/cook/scaleServings'
import type { CookIngredientData } from '@/components/cook/cookTypes'

interface RecipeIngredientsPageProps {
  ingredients: CookIngredientData[]
  /** Servings the stored amounts serve; null means amounts are shown as written. */
  recipeServings: number | null
  servings: number
  onServingsChange: (servings: number) => void
}

export default function RecipeIngredientsPage({
  ingredients,
  recipeServings,
  servings,
  onServingsChange,
}: RecipeIngredientsPageProps) {
  return (
    <div className="flex flex-col gap-3" data-testid="recipe-ingredients">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Ingredients</h2>
        {recipeServings ? (
          <ServingsControl servings={servings} onChange={onServingsChange} />
        ) : (
          <span className="text-sm text-ink-soft">Amounts as written</span>
        )}
      </div>
      {ingredients.length > 0 ? (
        <CookIngredientList ingredients={ingredients} scale={getServingsScale(servings, recipeServings)} />
      ) : (
        <p className="text-ink-soft">No ingredients listed.</p>
      )}
    </div>
  )
}
