/** Aisles shown on the Next week list, in shopping order. */
export const AISLES = [
  'Fresh produce',
  'Dairy and eggs',
  'Meat and deli',
  'Fish',
  'Bakery',
  'Frozen',
  'Cupboard',
  'Drinks and snacks',
  'Household',
  'Health and beauty',
  'Other',
] as const

export type Aisle = (typeof AISLES)[number]

export const isAisle = (value: string): value is Aisle => (AISLES as readonly string[]).includes(value)
