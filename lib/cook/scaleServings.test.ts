import { describe, it, expect } from 'vitest'
import {
  getServingsScale,
  changeServings,
  isScalableIngredient,
  MAX_SERVINGS,
  MIN_SERVINGS,
} from './scaleServings'
import { renderStepText, describeIngredient } from '@/lib/recipeStepTokens'

const ingredients = [
  { id: 'beef', name: 'beef mince', quantity: '500', unit: 'g', amount: 500 },
  { id: 'onion', name: 'onion', quantity: '1', unit: null, amount: 1 },
  { id: 'salt', name: 'salt', quantity: 'to taste', unit: null, amount: null },
  { id: 'water', name: 'water', quantity: null, unit: null, amount: null },
]

describe('servings scaling', () => {
  describe('getServingsScale', () => {
    it('should be 1 at the recipe servings', () => {
      expect(getServingsScale(4, 4)).toBe(1)
    })

    it('should double and triple', () => {
      expect(getServingsScale(8, 4)).toBe(2)
      expect(getServingsScale(12, 4)).toBe(3)
    })

    it('should halve', () => {
      expect(getServingsScale(2, 4)).toBe(0.5)
    })

    it('should be 1 when the recipe has no servings count', () => {
      expect(getServingsScale(6, null)).toBe(1)
      expect(getServingsScale(6, undefined)).toBe(1)
      expect(getServingsScale(6, 0)).toBe(1)
    })

    it('should be 1 for invalid wanted servings', () => {
      expect(getServingsScale(0, 4)).toBe(1)
      expect(getServingsScale(NaN, 4)).toBe(1)
    })
  })

  describe('changeServings', () => {
    it('should add and subtract', () => {
      expect(changeServings(4, 1)).toBe(5)
      expect(changeServings(4, -1)).toBe(3)
    })

    it('should stay within limits', () => {
      expect(changeServings(MIN_SERVINGS, -1)).toBe(MIN_SERVINGS)
      expect(changeServings(MAX_SERVINGS, 1)).toBe(MAX_SERVINGS)
    })
  })

  describe('isScalableIngredient', () => {
    it('should be true only with a numeric amount', () => {
      expect(isScalableIngredient({ amount: 2 })).toBe(true)
      expect(isScalableIngredient({ amount: null })).toBe(false)
      expect(isScalableIngredient({})).toBe(false)
    })
  })

  describe('flow into ingredient and step text', () => {
    it('should rescale 4 servings to 6 in the ingredient list and the step text', () => {
      const scale = getServingsScale(6, 4)
      expect(describeIngredient(ingredients[0], scale)).toBe('750 g beef mince')
      expect(renderStepText('Brown {ing:beef} with {ing:onion}.', ingredients, scale)).toBe(
        'Brown 750 g beef mince with 1.5 onion.'
      )
    })

    it('should rescale 4 servings to 2', () => {
      expect(renderStepText('Brown {ing:beef}.', ingredients, getServingsScale(2, 4))).toBe(
        'Brown 250 g beef mince.'
      )
    })

    it('should show free-text quantities unscaled', () => {
      const scale = getServingsScale(6, 4)
      expect(renderStepText('Add {ing:salt}.', ingredients, scale)).toBe('Add to taste salt.')
      expect(renderStepText('Add {ing:water}.', ingredients, scale)).toBe('Add water.')
    })
  })
})
