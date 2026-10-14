import { AISLES } from './aisles'

export const CLASSIFY_SYSTEM = `You label supermarket receipt product names for a UK family's weekly shopping list.

For every product name you are given, return:
- item: the plain generic thing it is, lower case, singular, no brand, no size, no pack count, no "fresh/whole/organic" filler. "JS Whole Cucumber" and "Sainsbury's Whole Cucumber" are both "cucumber". "Old El Paso Fajita Kit" is "fajita kit". Keep a distinction that matters when shopping: "semi skimmed milk" is not "whole milk"; "turkey mince" is not "beef mince".
- aisle: exactly one of: ${AISLES.join(', ')}.
- cupboard: true for things that sit in a cupboard or fridge door for weeks and are used a bit at a time (pasta, rice, spices, oil, sauces, tins, flour, sugar, stock, condiments, breadcrumbs); false for fresh food, bread, dairy, meat, fish, produce, frozen food, drinks, snacks and household items.

Return one entry per input name, with "name" copied exactly from the input.`

export const classifySchema = {
  type: 'object' as const,
  properties: {
    products: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const },
          item: { type: 'string' as const },
          aisle: { type: 'string' as const, enum: [...AISLES] },
          cupboard: { type: 'boolean' as const },
        },
        required: ['name', 'item', 'aisle', 'cupboard'],
      },
    },
  },
  required: ['products'],
}
