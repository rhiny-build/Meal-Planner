/**
 * Shared TypeScript Types for the Meal Planner App
 *
 * This file contains all the type definitions used across the application.
 * Keeping types in one place makes them easy to update and maintain.
 */

import { Recipe, MealPlan } from '@prisma/client'

// Re-export Prisma types for convenience
export type { Recipe, MealPlan }

// Type for a meal plan with the recipe details included
// This is useful when displaying the meal plan since we want to show recipe info
export type MealPlanWithRecipe = MealPlan & {
  proteinRecipe?: Recipe | null
  carbRecipe?: Recipe | null
  vegetableRecipe?: Recipe | null
  
}

// Enum-like types for recipe attributes (helps with type safety)
export type ProteinType = 'chicken' | 'fish' | 'red-meat' | 'vegetarian'
export type CarbType = 'rice' | 'pasta' | 'couscous' | 'fries' | 'other'
export type PrepTime = 'quick' | 'medium' | 'long'
export type RecipeTier = 'favorite' | 'non-regular' | 'new'
export type WeekPlan = {
    day: string
    date: Date
    proteinRecipeId: string
    carbRecipeId: string
    mealPlanId?: string // Database ID if it exists
}

// Form data type for creating/editing recipes
export interface RecipeFormData {
  name: string
  ingredients: string
  proteinType? : ProteinType
  carbType? : CarbType
  prepTime: PrepTime
  tier: RecipeTier
}

// Filter options for the recipe library
export interface RecipeFilters {
  tier?: RecipeTier
  proteinType?: ProteinType
  carbType?: CarbType
  prepTime?: PrepTime
}

// AI-related types

// Response from AI when extracting ingredients from a URL
export interface ExtractedRecipeData {
  ingredients: string
  name?: string // AI might extract the recipe name too
}

// Request to modify a meal plan using natural language
export interface MealPlanModificationRequest {
  instruction: string // e.g., "swap Tuesday for something faster"
  currentPlan: MealPlanWithRecipe[] // The current week's plan
  availableRecipes: Recipe[] // All recipes to choose from
}

// Response from AI after modifying the meal plan
export interface MealPlanModificationResult {
  modifiedPlan: {
    date: Date
    proteinRecipeId: string
    carbRecipeId: string
  }[]
  explanation: string // What the AI changed and why
}
