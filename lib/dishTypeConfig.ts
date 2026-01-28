/**
 * Dish Type Configuration
 *
 * Centralized options for protein and carb types.
 * Used across recipe filters, forms, and meal plan components.
 */

export const PROTEIN_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'chicken', label: 'Chicken' },
  { value: 'fish', label: 'Fish' },
  { value: 'red-meat', label: 'Red Meat' },
  { value: 'vegetarian', label: 'Vegetarian' },
]

export const CARB_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'rice', label: 'Rice' },
  { value: 'pasta', label: 'Pasta' },
  { value: 'couscous', label: 'Couscous' },
  { value: 'fries', label: 'Fries' },
  { value: 'other', label: 'Other' },
]

// Filter variants with 'All' instead of 'None'
export const PROTEIN_FILTER_OPTIONS = [
  { value: '', label: 'All' },
  ...PROTEIN_OPTIONS.slice(1),
]

export const CARB_FILTER_OPTIONS = [
  { value: '', label: 'All' },
  ...CARB_OPTIONS.slice(1),
]
