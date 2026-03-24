'use server'

/**
 * Shopping List Server Actions — Barrel Re-export
 *
 * All mutations for the shopping list module, re-exported from
 * their respective files for backwards-compatible imports.
 *
 * Actual implementations:
 *   - syncPipeline.ts — 5-step sync logic
 *   - shoppingListActions.ts — core CRUD (ensure, toggle, add, delete, get, include/exclude)
 *   - masterListActions.ts — master list CRUD
 *   - ingredientMappingActions.ts — ingredient mapping upsert
 */

// Sync pipeline
export { syncMealIngredients } from './syncPipeline'
export type { EmbeddingSuggestion } from './syncPipeline'

// Shopping list item actions
export {
  ensureShoppingListExists,
  toggleItem,
  addItem,
  deleteShoppingListItem,
  getShoppingList,
  includeMasterListItem,
  excludeMasterListItem,
} from './shoppingListActions'

// Master list management
export {
  addMasterListItem,
  updateMasterListItem,
  deleteMasterListItem,
} from './masterListActions'

// Ingredient mapping
export { createIngredientMapping } from './ingredientMappingActions'
