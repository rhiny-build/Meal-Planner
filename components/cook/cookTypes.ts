/**
 * Shapes passed from the cook page (server) to the cook screen (client).
 */

import type { StepIngredient } from '@/lib/recipeStepTokens'

export interface CookStepData {
  id: string
  order: number
  text: string
  timerSeconds: number | null
}

export interface CookIngredientData extends StepIngredient {
  notes?: string | null
}

export interface CookRecipeData {
  id: string
  name: string
  /** 'full' | 'quick' */
  kind: string
  /** Servings the stored amounts serve; null when unknown (no scaling then). */
  servings: number | null
  ingredients: CookIngredientData[]
  steps: CookStepData[]
}
