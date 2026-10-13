/**
 * CookCaptureSlot
 *
 * PLACEHOLDER (S09): the place for "tell me as you go" (capture the method
 * while cooking a recipe that has none). S09 replaces the body of this
 * component; the props below are the contract it can rely on. Nothing is
 * shown to the user until S09 renders something here.
 */

import type { CookRecipeData } from './cookTypes'

export interface CookCaptureSlotProps {
  recipe: CookRecipeData
  /** Servings currently chosen on the cook screen. */
  servings: number
}

export default function CookCaptureSlot({ recipe }: CookCaptureSlotProps) {
  return <div data-testid="cook-capture-slot" data-recipe-id={recipe.id} hidden />
}
