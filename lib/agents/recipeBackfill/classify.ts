/**
 * Rules that need no AI: which recipes look like quick items, and which are duplicates.
 * Deterministic on purpose, so a dry run costs nothing for these and gives the same answer each time.
 */

import type { RecipeSnapshot } from './types'

// ---- quick items -------------------------------------------------------------------------

const QUICK_NAME_PATTERN = /\b(fries|nuggets|onion rings|burgers?|sandwich|tortillas?|ready soup)\b|^air fried\b|^baked \w+$/i

/**
 * Why this recipe looks like a quick item (kind = quick), or null if it does not.
 * Only plain "full" recipes with no URL and no method are considered: a recipe that has
 * a source page or a method is a real recipe, however short its name.
 */
export function quickReason(recipe: RecipeSnapshot): string | null {
  if (recipe.kind !== 'full' || recipe.recipeUrl || recipe.stepCount > 0) return null
  if (/^simple\b/i.test(recipe.name)) return 'Name starts with "Simple"'
  if (QUICK_NAME_PATTERN.test(recipe.name)) return `Name looks like a quick item ("${recipe.name}")`
  if (recipe.ingredients.length <= 2) {
    return `Only ${recipe.ingredients.length} ingredient${recipe.ingredients.length === 1 ? '' : 's'} and no method`
  }
  return null
}

// ---- duplicates --------------------------------------------------------------------------

export function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export interface DuplicateGroup {
  key: string
  /** The recipe proposed to stay */
  keeper: RecipeSnapshot
  /** The others, proposed to be merged into the keeper */
  duplicates: RecipeSnapshot[]
}

function richness(r: RecipeSnapshot): number[] {
  const filled = [r.servings, r.totalTimeMinutes, r.description, r.notes, r.prepTime].filter((v) => v !== null && v !== '').length
  const slots = r.mealPlanRefs.lunch + r.mealPlanRefs.protein + r.mealPlanRefs.carb + r.mealPlanRefs.vegetable
  // Higher is better, compared left to right: method, filled fields, a source link, ingredients, plan history.
  // Plan history comes last on purpose: meal-plan rows get re-pointed in a merge, so they never decide who stays.
  return [r.stepCount > 0 ? 1 : 0, filled, r.recipeUrl ? 1 : 0, r.ingredients.length, slots]
}

/** Keeper = the copy with the most data; ties go to the older recipe (and then the id, for a stable answer). */
export function pickKeeper(group: RecipeSnapshot[]): RecipeSnapshot {
  return [...group].sort((a, b) => {
    const ra = richness(a)
    const rb = richness(b)
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return rb[i] - ra[i]
    return a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)
  })[0]
}

/** Recipes with the same name (ignoring case and punctuation), or the same source URL. */
export function findDuplicateGroups(recipes: RecipeSnapshot[]): DuplicateGroup[] {
  // Union-find over recipe indexes
  const parent = recipes.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b)
  }

  const seen = new Map<string, number>()
  recipes.forEach((r, i) => {
    for (const key of [`name:${normaliseName(r.name)}`, r.recipeUrl ? `url:${r.recipeUrl.trim().toLowerCase()}` : null]) {
      if (!key) continue
      if (seen.has(key)) union(i, seen.get(key)!)
      else seen.set(key, i)
    }
  })

  const members = new Map<number, RecipeSnapshot[]>()
  recipes.forEach((r, i) => members.set(find(i), [...(members.get(find(i)) ?? []), r]))

  return [...members.values()]
    .filter((g) => g.length > 1)
    .map((g) => {
      const keeper = pickKeeper(g)
      return { key: normaliseName(keeper.name), keeper, duplicates: g.filter((r) => r.id !== keeper.id) }
    })
}

/** Things the duplicate has that the keeper lacks: they would be lost if the duplicate is deleted. */
export function mergeWarnings(keeper: RecipeSnapshot, duplicate: RecipeSnapshot): string[] {
  const warnings: string[] = []
  if (duplicate.stepCount > 0 && keeper.stepCount === 0) warnings.push(`has a ${duplicate.stepCount}-step method the keeper lacks`)
  if (duplicate.recipeUrl && !keeper.recipeUrl) warnings.push('has a source URL the keeper lacks')
  // Compare ingredient names ignoring case and a plural "s" ("cucumber" vs "Cucumbers")
  const ingredientKey = (name: string) => normaliseName(name).replace(/s\b/g, '')
  const keeperNames = new Set(keeper.ingredients.map((i) => ingredientKey(i.name)))
  const extra = duplicate.ingredients.filter((i) => !keeperNames.has(ingredientKey(i.name))).map((i) => i.name)
  if (extra.length > 0) warnings.push(`has ingredients the keeper lacks: ${extra.join(', ')}`)
  for (const field of ['servings', 'totalTimeMinutes', 'description', 'notes'] as const) {
    if (duplicate[field] !== null && keeper[field] === null) warnings.push(`has ${field} the keeper lacks`)
  }
  return warnings
}
