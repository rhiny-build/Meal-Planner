/**
 * Drag and Drop Helper Functions
 *
 * Utility functions for the meal plan grid drag-and-drop functionality.
 */

import type { Recipe } from '@/types'

/** Valid column types for the meal plan grid */
export type MealColumn = 'protein' | 'carb' | 'vegetable'

/** Parsed cell ID containing column and day index */
export interface ParsedCellId {
  column: MealColumn
  dayIndex: number
}

/**
 * Parse a cell ID into its column and day index
 *
 * Cell IDs are formatted as `${column}-${dayIndex}`:
 * - "protein-0" = Monday's protein
 * - "carb-3" = Thursday's carb
 * - "vegetable-6" = Sunday's vegetable
 *
 * @param id - The cell ID string to parse
 * @returns Parsed column and dayIndex, or null if invalid
 */
export function parseCellId(id: string): ParsedCellId | null {
  const parts = id.split('-')
  if (parts.length !== 2) return null

  const column = parts[0] as MealColumn
  const dayIndex = parseInt(parts[1], 10)

  if (!['protein', 'carb', 'vegetable'].includes(column)) return null
  if (isNaN(dayIndex)) return null

  return { column, dayIndex }
}

/**
 * Create a cell ID from column and day index
 *
 * @param column - The column type
 * @param dayIndex - The day index (0 = Monday)
 * @returns Cell ID string
 */
export function createCellId(column: MealColumn, dayIndex: number): string {
  return `${column}-${dayIndex}`
}

/**
 * Get recipe name by ID from a list of recipes
 *
 * @param recipeId - The recipe ID to look up
 * @param recipes - Array of recipes to search
 * @returns Recipe name or empty string if not found
 */
export function getRecipeName(recipeId: string, recipes: Recipe[]): string {
  if (!recipeId) return ''
  const recipe = recipes.find(r => String(r.id) === recipeId)
  return recipe?.name || ''
}

/**
 * Check if two cells are in the same column
 *
 * @param cellA - First parsed cell
 * @param cellB - Second parsed cell
 * @returns True if same column
 */
export function isSameColumn(cellA: ParsedCellId, cellB: ParsedCellId): boolean {
  return cellA.column === cellB.column
}

/**
 * Check if two cells are the same cell
 *
 * @param cellA - First parsed cell
 * @param cellB - Second parsed cell
 * @returns True if same cell
 */
export function isSameCell(cellA: ParsedCellId, cellB: ParsedCellId): boolean {
  return cellA.column === cellB.column && cellA.dayIndex === cellB.dayIndex
}
