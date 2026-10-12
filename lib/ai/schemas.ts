/**
 * Tool input schemas for Claude structured output.
 *
 * Each schema is the `input_schema` of a single forced tool (see
 * callForcedTool in claude.ts). The model's tool input IS the result.
 */

import type Anthropic from '@anthropic-ai/sdk'

type Schema = Anthropic.Tool.InputSchema

export const MODIFY_MEAL_PLAN_SCHEMA: Schema = {
  type: 'object',
  properties: {
    modifiedPlan: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'ISO date string' },
          lunchRecipeId: { type: 'string' },
          proteinRecipeId: { type: 'string' },
          carbRecipeId: { type: 'string' },
          vegetableRecipeId: { type: 'string' },
        },
        required: ['date', 'lunchRecipeId', 'proteinRecipeId', 'carbRecipeId', 'vegetableRecipeId'],
      },
    },
    explanation: { type: 'string' },
  },
  required: ['modifiedPlan', 'explanation'],
}

export const NORMALISE_ITEMS_SCHEMA: Schema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          baseIngredient: { type: 'string' },
          canonicalName: { type: 'string' },
        },
        required: ['id', 'baseIngredient', 'canonicalName'],
      },
    },
  },
  required: ['items'],
}

export const NORMALISE_SINGLE_SCHEMA: Schema = {
  type: 'object',
  properties: {
    canonical: { type: 'string' },
    base: { type: 'string' },
    form: { type: ['string', 'null'] },
  },
  required: ['canonical', 'base', 'form'],
}

export const DISCOVER_RECIPES_SCHEMA: Schema = {
  type: 'object',
  properties: {
    recipes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          recipeUrl: { type: 'string', description: 'Direct URL to the recipe page' },
          ingredients: { type: 'string', description: 'One ingredient per line' },
          proteinType: { type: ['string', 'null'], enum: ['chicken', 'fish', 'red-meat', 'vegetarian', null] },
          carbType: { type: ['string', 'null'], enum: ['rice', 'pasta', 'couscous', 'fries', 'other', null] },
          prepTime: { type: 'string', enum: ['quick', 'medium', 'long'] },
          tier: { type: 'string', enum: ['new'] },
        },
        required: ['name', 'recipeUrl', 'ingredients', 'proteinType', 'carbType', 'prepTime', 'tier'],
      },
    },
  },
  required: ['recipes'],
}
