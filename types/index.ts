/**
 * Shared TypeScript Types for the Meal Planner App
 *
 * This file contains all the type definitions used across the application.
 * Keeping types in one place makes them easy to update and maintain.
 */

import { Recipe, MealPlan, Ingredient, ShoppingList, ShoppingListItem } from '@prisma/client'

// Re-export Prisma types for convenience
export type { Recipe, MealPlan, Ingredient, ShoppingList, ShoppingListItem }

// Type for a recipe with its structured ingredients included
export type RecipeWithIngredients = Recipe & {
  structuredIngredients: Ingredient[]
}

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
    vegetableRecipeId: string
    mealPlanId?: string // Database ID if it exists
}

// Form data type for creating/editing recipes
export interface RecipeFormData {
  name: string
  ingredients: string
  structuredIngredients?: StructuredIngredientData[] // Optional structured ingredients
  recipeUrl?: string
  proteinType?: ProteinType
  carbType?: CarbType
  vegetableType?: string // 'vegetable' when dish includes vegetables
  isLunchAppropriate?: boolean // Whether this recipe is suitable for lunch
  prepTime: PrepTime
  tier: RecipeTier
}

// Filter options for the recipe library
export interface RecipeFilters {
  tier?: RecipeTier
  proteinType?: ProteinType
  carbType?: CarbType
  prepTime?: PrepTime
  isLunchAppropriate?: boolean
}

// AI-related types

// Structured ingredient data for creating/updating ingredients
export interface StructuredIngredientData {
  name: string
  quantity?: string | null
  unit?: string | null
  notes?: string | null
  order: number
}

// Response from AI when extracting ingredients from a URL
export interface ExtractedRecipeData {
  ingredients: string // Legacy: ingredients as text
  structuredIngredients?: StructuredIngredientData[] // New: parsed ingredients
  name?: string // AI might extract the recipe name too
}

// Lightweight plan entry for AI requests (doesn't require full DB fields)
export interface PlanEntryForAI {
  date: Date
  dayOfWeek: string
  proteinRecipeId: string | null
  carbRecipeId: string | null
  vegetableRecipeId: string | null
  proteinRecipe?: Recipe | null
  carbRecipe?: Recipe | null
  vegetableRecipe?: Recipe | null
}

// Request body for creating/saving a week of meal plans
export interface BulkMealPlanRequest {
  startDate: string
  mealPlans: {
    dayOfWeek: string
    proteinRecipeId?: string | null
    carbRecipeId?: string | null
    vegetableRecipeId?: string | null
  }[]
}

// Request to modify a meal plan using natural language
export interface MealPlanModificationRequest {
  instruction: string // e.g., "swap Tuesday for something faster"
  currentPlan: PlanEntryForAI[] // The current week's plan
  availableRecipes: Recipe[] // All recipes to choose from
}

// Response from AI after modifying the meal plan
export interface MealPlanModificationResult {
  modifiedPlan: {
    date: Date
    proteinRecipeId: string
    carbRecipeId: string
    vegetableRecipeId: string
  }[]
  explanation: string // What the AI changed and why
}

// Shopping List types

// Type for a shopping list with its items included
export type ShoppingListWithItems = ShoppingList & {
  items: ShoppingListItem[]
}

// Aggregated ingredient for shopping list generation
export interface AggregatedIngredient {
  name: string // Normalized ingredient name
  quantities: Array<{
    quantity: string | null
    unit: string | null
    source: string // Recipe name for traceability
  }>
  combinedQuantity?: string // Combined if units match
  combinedUnit?: string
  notes?: string // Sources or other notes
}

// Request to generate a shopping list
export interface GenerateShoppingListRequest {
  weekStart: string // ISO date string for the Monday of the week
}

// Shopping list item for creating/updating
export interface ShoppingListItemData {
  name: string
  quantity?: string | null
  unit?: string | null
  notes?: string | null
  checked?: boolean
  isManual?: boolean
  order: number
}
