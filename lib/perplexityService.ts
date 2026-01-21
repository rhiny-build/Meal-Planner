/**
 * Perplexity Service
 *
 * Handles AI-powered recipe discovery using Perplexity API.
 * Perplexity combines web search with AI to find and extract recipe information.
 */

import type { RecipeFormData } from '@/types'

// Type for recipe suggestions returned by Perplexity
export interface RecipeSuggestion extends RecipeFormData {
  recipeUrl: string
}

/**
 * Searches for recipe suggestions based on user prompt
 *
 * @param prompt - User's natural language request (e.g., "quick chicken dinners")
 * @returns Array of recipe suggestions with all fields populated
 */
export const discoverRecipes = async (
  prompt: string
): Promise<RecipeSuggestion[]> => {
  try {
    const response = await fetch('/api/recipes/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to discover recipes')
    }

    const data = await response.json()
    return data.recipes || []
  } catch (error) {
    console.error('Error discovering recipes:', error)
    throw error
  }
}
