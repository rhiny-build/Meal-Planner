/**
 * Ingredient Helper Functions
 *
 * Shared utilities for working with ingredient data.
 */

import type { Ingredient } from '@/types'

/**
 * Format a structured ingredient for display.
 * Combines quantity, unit, name, and notes into a readable string.
 */
export function formatIngredient(ing: Ingredient): string {
  const parts: string[] = []
  if (ing.quantity) parts.push(ing.quantity)
  if (ing.unit) parts.push(ing.unit)
  parts.push(ing.name)
  if (ing.notes) parts.push(`(${ing.notes})`)
  return parts.join(' ')
}
