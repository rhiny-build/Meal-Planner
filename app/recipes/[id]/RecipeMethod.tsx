/**
 * RecipeMethod
 *
 * The method section of a recipe page. Step text holds {ing:<id>} tokens; each
 * one is turned into the ingredient's amount + unit + name (S03 helpers). A
 * recipe with no steps shows nothing here at all: a method is optional and the
 * page never asks for one.
 */

import {
  parseStepText,
  describeIngredient,
  UNKNOWN_INGREDIENT_TEXT,
} from '@/lib/recipeStepTokens'
import type { StepIngredient } from '@/lib/recipeStepTokens'

interface Step {
  id: string
  order: number
  text: string
  timerSeconds: number | null
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} sec`
  return s ? `${m} min ${s} sec` : `${m} min`
}

export default function RecipeMethod({
  steps,
  ingredients,
}: {
  steps: Step[]
  ingredients: StepIngredient[]
}) {
  if (steps.length === 0) return null
  const byId = new Map(ingredients.map((i) => [i.id, i]))

  return (
    <section className="mb-8" aria-labelledby="method-heading">
      <h2 id="method-heading" className="text-xl font-semibold mb-3">
        Method
      </h2>
      <ol className="space-y-4" data-testid="method-list">
        {steps.map((step, i) => (
          <li key={step.id} className="flex gap-3" data-testid="method-step">
            <span className="flex-none w-7 h-7 rounded-full bg-blue-600 dark:bg-fuchsia-600 text-white text-sm font-semibold flex items-center justify-center">
              {i + 1}
            </span>
            <div className="flex-1">
              <p>
                {parseStepText(step.text).map((seg, j) => {
                  if (seg.type === 'text') return <span key={j}>{seg.text}</span>
                  const ing = byId.get(seg.id)
                  return (
                    <strong key={j} className="font-semibold">
                      {ing ? describeIngredient(ing) : UNKNOWN_INGREDIENT_TEXT}
                    </strong>
                  )
                })}
              </p>
              {step.timerSeconds ? (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Timer: {formatTimer(step.timerSeconds)}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
