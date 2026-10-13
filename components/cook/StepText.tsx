/**
 * StepText
 *
 * Step text with each {ing:<id>} token replaced by the ingredient's amount,
 * scaled for the chosen servings, shown in bold.
 */

import {
  parseStepText,
  describeIngredient,
  UNKNOWN_INGREDIENT_TEXT,
} from '@/lib/recipeStepTokens'
import type { StepIngredient } from '@/lib/recipeStepTokens'

interface StepTextProps {
  text: string
  ingredients: StepIngredient[]
  scale: number
}

export default function StepText({ text, ingredients, scale }: StepTextProps) {
  const ingredientsById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]))
  return (
    <>
      {parseStepText(text).map((segment, index) => {
        if (segment.type === 'text') return <span key={index}>{segment.text}</span>
        const ingredient = ingredientsById.get(segment.id)
        return (
          <strong key={index} className="font-bold text-blue-700 dark:text-fuchsia-300">
            {ingredient ? describeIngredient(ingredient, scale) : UNKNOWN_INGREDIENT_TEXT}
          </strong>
        )
      })}
    </>
  )
}
