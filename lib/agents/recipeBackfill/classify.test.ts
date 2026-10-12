import { describe, it, expect } from 'vitest'
import { findDuplicateGroups, mergeWarnings, normaliseName, pickKeeper, quickReason } from './classify'
import type { RecipeSnapshot } from './types'

let counter = 0
function recipe(over: Partial<RecipeSnapshot> = {}): RecipeSnapshot {
  counter++
  return {
    id: `r${counter}`,
    name: `Recipe ${counter}`,
    kind: 'full',
    recipeUrl: null,
    servings: null,
    totalTimeMinutes: null,
    description: null,
    notes: null,
    prepTime: null,
    stepCount: 0,
    createdAt: new Date(2026, 0, counter),
    ingredients: [1, 2, 3, 4].map((n) => ({ id: `i${counter}-${n}`, name: `thing ${n}`, quantity: null, unit: null, notes: null })),
    mealPlanRefs: { lunch: 0, protein: 0, carb: 0, vegetable: 0 },
    ...over,
  }
}

describe('quickReason', () => {
  it.each(['Simple Fries', 'Simple Steamed Rice', 'Chicken Nuggets', 'Burgers and Fries', 'Nuggets and Onion Rings', 'Steak Sandwich', 'Tortillas', 'Ready soup', 'Air Fried Green Beans', 'Baked Cauliflower'])(
    'proposes quick for "%s"',
    (name) => {
      expect(quickReason(recipe({ name }))).toBeTruthy()
    }
  )

  it('proposes quick for a one or two ingredient item with no method', () => {
    expect(quickReason(recipe({ name: 'Buttered Peas', ingredients: [{ id: 'a', name: 'peas', quantity: null, unit: null, notes: null }] }))).toMatch(/Only 1 ingredient /)
  })

  it('leaves family recipes and real recipes alone', () => {
    expect(quickReason(recipe({ name: "Rhiny's Schnitzels" }))).toBeNull()
    expect(quickReason(recipe({ name: 'Beef in Oyster Sauce' }))).toBeNull()
    expect(quickReason(recipe({ name: 'Tuna and Anchovy Pasta' }))).toBeNull()
  })

  it('never proposes quick for a recipe with a link, a method, or an existing kind', () => {
    expect(quickReason(recipe({ name: 'Simple Fries', recipeUrl: 'https://x.test/a' }))).toBeNull()
    expect(quickReason(recipe({ name: 'Simple Fries', stepCount: 2 }))).toBeNull()
    expect(quickReason(recipe({ name: 'Simple Fries', kind: 'quick' }))).toBeNull()
  })
})

describe('duplicates', () => {
  it('normalises names', () => {
    expect(normaliseName('  Easy Asian  Cucumber-Salad! ')).toBe('easy asian cucumber salad')
  })

  it('groups by name and picks the copy with the most data as keeper', () => {
    const thin = recipe({ name: 'Easy Asian Cucumber Salad' })
    const rich = recipe({ name: 'easy asian cucumber salad', servings: 4, recipeUrl: 'https://x.test/c', mealPlanRefs: { lunch: 0, protein: 0, carb: 0, vegetable: 2 } })
    const other = recipe({ name: 'Something else' })
    const groups = findDuplicateGroups([thin, other, rich])
    expect(groups).toHaveLength(1)
    expect(groups[0].keeper.id).toBe(rich.id)
    expect(groups[0].duplicates.map((d) => d.id)).toEqual([thin.id])
  })

  it('groups by identical link even when the names differ', () => {
    const a = recipe({ name: 'Sea bass', recipeUrl: 'https://x.test/s' })
    const b = recipe({ name: 'Pan fried sea bass', recipeUrl: 'HTTPS://X.test/s ' })
    expect(findDuplicateGroups([a, b])).toHaveLength(1)
  })

  it('ties go to the older recipe, so the answer is stable', () => {
    const older = recipe({ name: 'Dup', createdAt: new Date(2020, 0, 1) })
    const newer = recipe({ name: 'Dup', createdAt: new Date(2025, 0, 1) })
    expect(pickKeeper([newer, older]).id).toBe(older.id)
  })

  it('warns about data only the duplicate has', () => {
    const keeper = recipe({ name: 'X' })
    const dup = recipe({ name: 'X', stepCount: 3, recipeUrl: 'https://x.test', servings: 2 })
    const w = mergeWarnings(keeper, dup).join(' | ')
    expect(w).toMatch(/3-step method/)
    expect(w).toMatch(/source URL/)
    expect(w).toMatch(/servings/)
  })

  it('has no warnings when nothing would be lost', () => {
    const keeper = recipe({ name: 'X', servings: 4, ingredients: [{ id: 'a', name: 'Salt', quantity: null, unit: null, notes: null }] })
    const dup = recipe({ name: 'X', ingredients: [{ id: 'b', name: 'salt', quantity: null, unit: null, notes: null }] })
    expect(mergeWarnings(keeper, dup)).toEqual([])
  })
})
