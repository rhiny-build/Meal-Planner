/**
 * Cook mode servings scaling (pure functions)
 *
 * The scale factor is wantedServings / recipeServings. It is passed to
 * describeIngredient / renderStepText (lib/recipeStepTokens.ts), which
 * multiply each ingredient's numeric `amount`. Ingredients with no numeric
 * amount keep their free-text quantity unscaled; we never guess.
 */

export const MIN_SERVINGS = 1
export const MAX_SERVINGS = 99

/** Scale factor for the wanted servings; 1 when the recipe has no usable servings count. */
export function getServingsScale(
  wantedServings: number,
  recipeServings: number | null | undefined
): number {
  if (!recipeServings || recipeServings <= 0 || !Number.isFinite(recipeServings)) return 1
  if (!Number.isFinite(wantedServings) || wantedServings <= 0) return 1
  return wantedServings / recipeServings
}

/** Add `delta` to the servings, staying within MIN_SERVINGS..MAX_SERVINGS. */
export function changeServings(current: number, delta: number): number {
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(current + delta)))
}

/** True when changing servings changes this ingredient's amount (it has a number). */
export function isScalableIngredient(ingredient: { amount?: number | null }): boolean {
  return typeof ingredient.amount === 'number' && Number.isFinite(ingredient.amount)
}
