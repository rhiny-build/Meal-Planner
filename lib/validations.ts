/**
 * Zod Validation Schemas
 *
 * Centralized validation for Recipe and MealPlan models.
 * Single source of truth that matches the Prisma schema.
 */

import { z } from 'zod'

/**
 * Recipe Validation Schema
 */
export const recipeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  proteinType: z.string().optional(),
  carbType: z.string().optional(),
  tier: z.enum(['regular', 'non-regular', 'favorite']).default('regular'),
  prepTime: z.string().optional(),
  description: z.string().optional(),
})

export type RecipeInput = z.infer<typeof recipeSchema>

/**
 * Meal Plan Validation Schema
 */
export const mealPlanSchema = z.object({
  date: z.string().datetime(),
  dayOfWeek: z.string().min(1, 'Day of week is required'),
  proteinRecipeId: z.string().optional(),
  carbRecipeId: z.string().optional(),
  vegetableRecipeId: z.string().optional(),
})

export type MealPlanInput = z.infer<typeof mealPlanSchema>

/**
 * Bulk Meal Plan Creation Schema
 * For saving multiple meal plans at once
 */
export const bulkMealPlanSchema = z.object({
  startDate: z.string(),
  mealPlans: z.array(
    z.object({
      dayOfWeek: z.string(),
      proteinRecipeId: z.string().optional().nullable(),
      carbRecipeId: z.string().optional().nullable(),
      vegetableRecipeId: z.string().optional().nullable(),
    })
  )
})

export type BulkMealPlanInput = z.infer<typeof bulkMealPlanSchema>
