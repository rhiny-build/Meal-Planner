import { describe, it, expect } from 'vitest'
import { normaliseName, normaliseNames } from './normalise'

describe('normaliseName', () => {
  describe('form extraction', () => {
    it('should extract fresh form from "fresh garlic"', () => {
      const result = normaliseName('fresh garlic')
      expect(result).toEqual({ canonical: 'garlic (fresh)', base: 'garlic', form: 'fresh' })
    })

    it('should extract fresh form from "garlic cloves"', () => {
      const result = normaliseName('garlic cloves')
      expect(result).toEqual({ canonical: 'garlic (fresh)', base: 'garlic', form: 'fresh' })
    })

    it('should extract tinned form from "tinned tomatoes"', () => {
      const result = normaliseName('tinned tomatoes')
      expect(result).toEqual({ canonical: 'tomato (tinned)', base: 'tomato', form: 'tinned' })
    })

    it('should extract tinned form from "canned tomatoes"', () => {
      const result = normaliseName('canned tomatoes')
      expect(result).toEqual({ canonical: 'tomato (tinned)', base: 'tomato', form: 'tinned' })
    })

    it('should extract dried form from "garlic granules"', () => {
      const result = normaliseName('garlic granules')
      expect(result).toEqual({ canonical: 'garlic (dried)', base: 'garlic', form: 'dried' })
    })

    it('should extract dried form from "dried oregano"', () => {
      const result = normaliseName('dried oregano')
      expect(result).toEqual({ canonical: 'oregano (dried)', base: 'oregano', form: 'dried' })
    })

    it('should extract ground form from "ground cumin"', () => {
      const result = normaliseName('ground cumin')
      expect(result).toEqual({ canonical: 'cumin (ground)', base: 'cumin', form: 'ground' })
    })

    it('should extract paste form from "tomato paste"', () => {
      const result = normaliseName('tomato paste')
      expect(result).toEqual({ canonical: 'tomato (paste)', base: 'tomato', form: 'paste' })
    })

    it('should extract flaked form from "flaked almonds"', () => {
      const result = normaliseName('flaked almonds')
      expect(result).toEqual({ canonical: 'almond (flaked)', base: 'almond', form: 'flaked' })
    })

    it('should extract frozen form from "frozen peas"', () => {
      const result = normaliseName('frozen peas')
      expect(result).toEqual({ canonical: 'pea (frozen)', base: 'pea', form: 'frozen' })
    })

    it('should extract smoked form from "smoked tofu"', () => {
      const result = normaliseName('smoked tofu')
      expect(result).toEqual({ canonical: 'tofu (smoked)', base: 'tofu', form: 'smoked' })
    })
  })

  describe('no form (pass-through)', () => {
    it('should pass through "chicken breast" without form', () => {
      const result = normaliseName('chicken breast')
      expect(result).toEqual({ canonical: 'chicken breast', base: 'chicken breast', form: null })
    })

    it('should pass through "olive oil" without form', () => {
      const result = normaliseName('olive oil')
      expect(result).toEqual({ canonical: 'olive oil', base: 'olive oil', form: null })
    })

    it('should pass through "soy sauce" without form', () => {
      const result = normaliseName('soy sauce')
      expect(result).toEqual({ canonical: 'soy sauce', base: 'soy sauce', form: null })
    })

    it('should singularise "spring onions" to "spring onion"', () => {
      const result = normaliseName('spring onions')
      expect(result).toEqual({ canonical: 'spring onion', base: 'spring onion', form: null })
    })
  })

  describe('compound exceptions', () => {
    it('should treat "ground beef" as a base, not form=ground', () => {
      const result = normaliseName('ground beef')
      expect(result).toEqual({ canonical: 'ground beef', base: 'ground beef', form: null })
    })

    it('should treat "smoked salmon" as a base, not form=smoked', () => {
      const result = normaliseName('smoked salmon')
      expect(result).toEqual({ canonical: 'smoked salmon', base: 'smoked salmon', form: null })
    })

    it('should treat "smoked paprika" as a base, not form=smoked', () => {
      const result = normaliseName('smoked paprika')
      expect(result).toEqual({ canonical: 'smoked paprika', base: 'smoked paprika', form: null })
    })
  })

  describe('quantity stripping', () => {
    it('should strip leading quantities "2 garlic cloves"', () => {
      const result = normaliseName('2 garlic cloves')
      expect(result).toEqual({ canonical: 'garlic (fresh)', base: 'garlic', form: 'fresh' })
    })

    it('should strip quantities with units "500g chicken breast"', () => {
      const result = normaliseName('500g chicken breast')
      expect(result).toEqual({ canonical: 'chicken breast', base: 'chicken breast', form: null })
    })

    it('should strip "2 lbs ground beef" and treat as compound exception', () => {
      const result = normaliseName('2 lbs ground beef')
      expect(result).toEqual({ canonical: 'ground beef', base: 'ground beef', form: null })
    })
  })

  describe('singularisation', () => {
    it('should singularise "tomatoes" to "tomato"', () => {
      const result = normaliseName('tomatoes')
      expect(result).toEqual({ canonical: 'tomato', base: 'tomato', form: null })
    })

    it('should singularise "potatoes" to "potato"', () => {
      const result = normaliseName('potatoes')
      expect(result).toEqual({ canonical: 'potato', base: 'potato', form: null })
    })

    it('should singularise "carrots" to "carrot"', () => {
      const result = normaliseName('carrots')
      expect(result).toEqual({ canonical: 'carrot', base: 'carrot', form: null })
    })
  })

  describe('case insensitivity', () => {
    it('should handle uppercase "FRESH GARLIC"', () => {
      const result = normaliseName('FRESH GARLIC')
      expect(result).toEqual({ canonical: 'garlic (fresh)', base: 'garlic', form: 'fresh' })
    })

    it('should handle mixed case "Tinned Tomatoes"', () => {
      const result = normaliseName('Tinned Tomatoes')
      expect(result).toEqual({ canonical: 'tomato (tinned)', base: 'tomato', form: 'tinned' })
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = normaliseName('')
      expect(result).toEqual({ canonical: '', base: '', form: null })
    })

    it('should handle whitespace-only string', () => {
      const result = normaliseName('   ')
      expect(result).toEqual({ canonical: '', base: '', form: null })
    })

    it('should handle single word "rice"', () => {
      const result = normaliseName('rice')
      expect(result).toEqual({ canonical: 'rice', base: 'rice', form: null })
    })
  })
})

describe('normaliseNames', () => {
  it('should normalise a batch of names', () => {
    const results = normaliseNames(['fresh garlic', 'tinned tomatoes', 'chicken breast'])
    expect(results).toEqual([
      { canonical: 'garlic (fresh)', base: 'garlic', form: 'fresh' },
      { canonical: 'tomato (tinned)', base: 'tomato', form: 'tinned' },
      { canonical: 'chicken breast', base: 'chicken breast', form: null },
    ])
  })

  it('should handle empty array', () => {
    expect(normaliseNames([])).toEqual([])
  })
})
