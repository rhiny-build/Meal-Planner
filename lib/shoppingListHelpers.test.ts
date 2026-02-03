/**
 * Shopping List Helpers Tests
 *
 * Tests for shopping list business logic:
 * - stripUnitsFromName: Removes quantities and units from ingredient names
 * - aggregateIngredients: Groups ingredients by name across recipes
 * - collectIngredientsFromMealPlans: Extracts ingredients from meal plan data
 * - formatShoppingListAsText: Formats items for export
 */

import { describe, it, expect } from 'vitest'
import {
  stripUnitsFromName,
  aggregateIngredients,
  collectIngredientsFromMealPlans,
  formatShoppingListAsText,
  type RawIngredient,
} from './shoppingListHelpers'
import type { ShoppingListItem } from '@/types'

describe('shoppingListHelpers', () => {
  describe('stripUnitsFromName', () => {
    it('should strip quantity and unit prefix', () => {
      expect(stripUnitsFromName('2 lb chicken')).toBe('chicken')
      expect(stripUnitsFromName('500g beef')).toBe('beef')
      expect(stripUnitsFromName('1 cup rice')).toBe('rice')
    })

    it('should handle metric units', () => {
      expect(stripUnitsFromName('200 grams flour')).toBe('flour')
      expect(stripUnitsFromName('500 ml milk')).toBe('milk')
      expect(stripUnitsFromName('1 kg potatoes')).toBe('potatoes')
    })

    it('should handle imperial units', () => {
      expect(stripUnitsFromName('2 lbs ground beef')).toBe('ground beef')
      expect(stripUnitsFromName('8 oz cream cheese')).toBe('cream cheese')
      expect(stripUnitsFromName('1 pound butter')).toBe('butter')
    })

    it('should handle cooking measurements', () => {
      expect(stripUnitsFromName('2 tbsp olive oil')).toBe('olive oil')
      expect(stripUnitsFromName('1 tsp salt')).toBe('salt')
      expect(stripUnitsFromName('3 tablespoons honey')).toBe('honey')
      expect(stripUnitsFromName('1/2 teaspoon pepper')).toBe('pepper')
    })

    it('should handle count-based units', () => {
      expect(stripUnitsFromName('3 cloves garlic')).toBe('garlic')
      expect(stripUnitsFromName('2 cans tomatoes')).toBe('tomatoes')
      expect(stripUnitsFromName('1 bunch parsley')).toBe('parsley')
      expect(stripUnitsFromName('4 slices bacon')).toBe('bacon')
    })

    it('should handle fractional quantities', () => {
      expect(stripUnitsFromName('½ cup sugar')).toBe('sugar')
      expect(stripUnitsFromName('¼ tsp cinnamon')).toBe('cinnamon')
      expect(stripUnitsFromName('1/2 lb salmon')).toBe('salmon')
    })

    it('should handle quantities without units', () => {
      expect(stripUnitsFromName('2 chicken breasts')).toBe('chicken breasts')
      expect(stripUnitsFromName('3 eggs')).toBe('eggs')
    })

    it('should handle size descriptors', () => {
      expect(stripUnitsFromName('2 large onions')).toBe('onions')
      expect(stripUnitsFromName('1 medium carrot')).toBe('carrot')
      expect(stripUnitsFromName('3 small potatoes')).toBe('potatoes')
    })

    it('should return original name when no prefix to strip', () => {
      expect(stripUnitsFromName('salt')).toBe('salt')
      expect(stripUnitsFromName('olive oil')).toBe('olive oil')
    })

    it('should handle unit with trailing period', () => {
      expect(stripUnitsFromName('2 oz. cheddar')).toBe('cheddar')
    })

    it('should handle parenthetical quantities', () => {
      expect(stripUnitsFromName('(5-6 oz) chicken thighs')).toBe('chicken thighs')
      expect(stripUnitsFromName('chicken breast (6 oz)')).toBe('chicken breast')
      expect(stripUnitsFromName('(1 lb) ground beef')).toBe('ground beef')
    })

    it('should handle unit-only prefixes without numbers', () => {
      expect(stripUnitsFromName('lb. ground beef')).toBe('ground beef')
      expect(stripUnitsFromName('Tbsp. olive oil')).toBe('olive oil')
      expect(stripUnitsFromName('cup flour')).toBe('flour')
    })

    it('should preserve multi-word ingredient names', () => {
      expect(stripUnitsFromName('1 cup sour cream')).toBe('sour cream')
      expect(stripUnitsFromName('2 tbsp soy sauce')).toBe('soy sauce')
    })
  })

  describe('aggregateIngredients', () => {
    it('should group same ingredients together', () => {
      const ingredients: RawIngredient[] = [
        { name: 'chicken', recipeName: 'Recipe A' },
        { name: 'chicken', recipeName: 'Recipe B' },
      ]

      const result = aggregateIngredients(ingredients)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('chicken')
      expect(result[0].sources).toEqual(['Recipe A', 'Recipe B'])
    })

    it('should be case-insensitive when grouping', () => {
      const ingredients: RawIngredient[] = [
        { name: 'Chicken', recipeName: 'Recipe A' },
        { name: 'chicken', recipeName: 'Recipe B' },
        { name: 'CHICKEN', recipeName: 'Recipe C' },
      ]

      const result = aggregateIngredients(ingredients)

      expect(result).toHaveLength(1)
      expect(result[0].sources).toHaveLength(3)
    })

    it('should strip units before grouping', () => {
      const ingredients: RawIngredient[] = [
        { name: '2 lbs chicken', recipeName: 'Recipe A' },
        { name: '500g chicken', recipeName: 'Recipe B' },
      ]

      const result = aggregateIngredients(ingredients)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('chicken')
      expect(result[0].sources).toEqual(['Recipe A', 'Recipe B'])
    })

    it('should sort results alphabetically', () => {
      const ingredients: RawIngredient[] = [
        { name: 'zucchini', recipeName: 'Recipe A' },
        { name: 'apple', recipeName: 'Recipe B' },
        { name: 'milk', recipeName: 'Recipe C' },
      ]

      const result = aggregateIngredients(ingredients)

      expect(result.map(i => i.name)).toEqual(['apple', 'milk', 'zucchini'])
    })

    it('should not duplicate recipe sources for same ingredient', () => {
      const ingredients: RawIngredient[] = [
        { name: 'salt', recipeName: 'Recipe A' },
        { name: 'salt', recipeName: 'Recipe A' },
      ]

      const result = aggregateIngredients(ingredients)

      expect(result).toHaveLength(1)
      expect(result[0].sources).toEqual(['Recipe A'])
    })

    it('should handle empty input', () => {
      const result = aggregateIngredients([])
      expect(result).toEqual([])
    })

    it('should keep distinct ingredients separate', () => {
      const ingredients: RawIngredient[] = [
        { name: 'chicken', recipeName: 'Recipe A' },
        { name: 'beef', recipeName: 'Recipe B' },
        { name: 'pork', recipeName: 'Recipe C' },
      ]

      const result = aggregateIngredients(ingredients)

      expect(result).toHaveLength(3)
    })
  })

  describe('collectIngredientsFromMealPlans', () => {
    it('should collect ingredients from all recipe types', () => {
      const mealPlans = [
        {
          proteinRecipe: {
            name: 'Grilled Chicken',
            structuredIngredients: [{ name: 'chicken breast' }],
          },
          carbRecipe: {
            name: 'Rice Pilaf',
            structuredIngredients: [{ name: 'rice' }],
          },
          vegetableRecipe: {
            name: 'Salad',
            structuredIngredients: [{ name: 'lettuce' }],
          },
        },
      ]

      const result = collectIngredientsFromMealPlans(mealPlans)

      expect(result).toHaveLength(3)
      expect(result).toContainEqual({ name: 'chicken breast', recipeName: 'Grilled Chicken' })
      expect(result).toContainEqual({ name: 'rice', recipeName: 'Rice Pilaf' })
      expect(result).toContainEqual({ name: 'lettuce', recipeName: 'Salad' })
    })

    it('should handle null recipes', () => {
      const mealPlans = [
        {
          proteinRecipe: {
            name: 'Grilled Chicken',
            structuredIngredients: [{ name: 'chicken' }],
          },
          carbRecipe: null,
          vegetableRecipe: undefined,
        },
      ]

      const result = collectIngredientsFromMealPlans(mealPlans)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('chicken')
    })

    it('should handle recipes without structured ingredients', () => {
      const mealPlans = [
        {
          proteinRecipe: {
            name: 'Mystery Dish',
            structuredIngredients: undefined,
          },
        },
      ]

      const result = collectIngredientsFromMealPlans(mealPlans)

      expect(result).toHaveLength(0)
    })

    it('should handle multiple meal plans', () => {
      const mealPlans = [
        {
          proteinRecipe: {
            name: 'Monday Chicken',
            structuredIngredients: [{ name: 'chicken' }],
          },
        },
        {
          proteinRecipe: {
            name: 'Tuesday Fish',
            structuredIngredients: [{ name: 'salmon' }],
          },
        },
      ]

      const result = collectIngredientsFromMealPlans(mealPlans)

      expect(result).toHaveLength(2)
    })

    it('should handle empty meal plans array', () => {
      const result = collectIngredientsFromMealPlans([])
      expect(result).toEqual([])
    })

    it('should collect multiple ingredients from same recipe', () => {
      const mealPlans = [
        {
          proteinRecipe: {
            name: 'Stir Fry',
            structuredIngredients: [
              { name: 'chicken' },
              { name: 'soy sauce' },
              { name: 'ginger' },
            ],
          },
        },
      ]

      const result = collectIngredientsFromMealPlans(mealPlans)

      expect(result).toHaveLength(3)
      expect(result.every(r => r.recipeName === 'Stir Fry')).toBe(true)
    })
  })

  describe('formatShoppingListAsText', () => {
    it('should format unchecked items as bullet list', () => {
      const items: ShoppingListItem[] = [
        createMockItem({ name: 'chicken', checked: false }),
        createMockItem({ name: 'rice', checked: false }),
      ]

      const result = formatShoppingListAsText(items)

      expect(result).toBe('- chicken\n- rice')
    })

    it('should exclude checked items', () => {
      const items: ShoppingListItem[] = [
        createMockItem({ name: 'chicken', checked: false }),
        createMockItem({ name: 'rice', checked: true }),
        createMockItem({ name: 'bread', checked: false }),
      ]

      const result = formatShoppingListAsText(items)

      expect(result).toBe('- chicken\n- bread')
      expect(result).not.toContain('rice')
    })

    it('should return empty string when all items are checked', () => {
      const items: ShoppingListItem[] = [
        createMockItem({ name: 'chicken', checked: true }),
        createMockItem({ name: 'rice', checked: true }),
      ]

      const result = formatShoppingListAsText(items)

      expect(result).toBe('')
    })

    it('should handle empty array', () => {
      const result = formatShoppingListAsText([])
      expect(result).toBe('')
    })

    it('should handle single item', () => {
      const items: ShoppingListItem[] = [
        createMockItem({ name: 'milk', checked: false }),
      ]

      const result = formatShoppingListAsText(items)

      expect(result).toBe('- milk')
    })
  })
})

/**
 * Helper to create mock ShoppingListItem objects for testing
 */
function createMockItem(overrides: Partial<ShoppingListItem>): ShoppingListItem {
  return {
    id: 'test-id',
    shoppingListId: 'test-list-id',
    name: 'test item',
    quantity: null,
    unit: null,
    notes: null,
    checked: false,
    source: 'meal',
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}
