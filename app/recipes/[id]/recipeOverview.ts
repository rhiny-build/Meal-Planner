/**
 * What the recipe page's Overview tab shows, worked out on the server so the
 * client component only receives plain, small data.
 */

import { getRecipeTimeLabel } from '@/lib/recipeTimeLabel'

export type RecipeOverviewData = {
  description: string | null
  notes: string | null
  recipeUrl: string | null
  /** "40 min", or the coarse prep bucket when no exact time is known. */
  timeLabel: string | null
  servings: number | null
  stepCount: number
  chips: { label: string; isHighlighted: boolean }[]
}

const TIER_LABELS: Record<string, string> = {
  favorite: 'Favourite',
  'non-regular': 'Non-regular',
  new: 'New',
}

interface RecipeOverviewSource {
  description: string | null
  notes: string | null
  recipeUrl: string | null
  totalTimeMinutes: number | null
  prepTime: string | null
  servings: number | null
  kind: string
  tier: string
  proteinType: string | null
  carbType: string | null
  steps: unknown[]
}

export function getRecipeOverview(recipe: RecipeOverviewSource): RecipeOverviewData {
  const chips: RecipeOverviewData['chips'] = []
  if (recipe.kind === 'quick') chips.push({ label: 'Quick', isHighlighted: true })
  if (recipe.proteinType) chips.push({ label: recipe.proteinType.replace('-', ' '), isHighlighted: false })
  if (recipe.carbType) chips.push({ label: recipe.carbType, isHighlighted: false })
  if (recipe.tier === 'favorite') chips.push({ label: TIER_LABELS.favorite, isHighlighted: true })
  else if (TIER_LABELS[recipe.tier]) chips.push({ label: TIER_LABELS[recipe.tier], isHighlighted: false })

  return {
    description: recipe.description,
    notes: recipe.notes,
    recipeUrl: recipe.recipeUrl,
    timeLabel: getRecipeTimeLabel(recipe),
    servings: recipe.servings,
    stepCount: recipe.steps.length,
    chips,
  }
}
