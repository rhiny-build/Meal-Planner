/**
 * The time to show for a recipe: the exact total ("40 min") when known,
 * otherwise the coarse prep bucket; null when neither is set.
 */

import { formatCookTime } from '@/lib/tonight'

const PREP_BUCKET_LABELS: Record<string, string> = {
  quick: 'Under 30 min',
  medium: '30–60 min',
  long: 'Over an hour',
}

export function getRecipeTimeLabel(recipe: {
  totalTimeMinutes?: number | null
  prepTime?: string | null
}): string | null {
  return formatCookTime(recipe.totalTimeMinutes) ?? (recipe.prepTime ? PREP_BUCKET_LABELS[recipe.prepTime] ?? null : null)
}
