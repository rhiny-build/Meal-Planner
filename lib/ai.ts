/**
 * AI Abstraction Layer
 *
 * This module provides a clean interface for all AI operations in the app.
 * Currently uses OpenAI, but is designed to be easily swappable with Claude
 * or other AI providers in the future.
 *
 * TO SWITCH TO CLAUDE API:
 * 1. Install the Anthropic SDK: npm install @anthropic-ai/sdk
 * 2. Replace the OpenAI import and client initialization
 * 3. Update the implementation of each function to use Claude's API
 * 4. Update the .env file with ANTHROPIC_API_KEY
 *
 * The function signatures (inputs and outputs) should remain the same,
 * so the rest of the app won't need to change.
 */

import OpenAI from 'openai'
import type {
  ExtractedRecipeData,
  MealPlanModificationRequest,
  MealPlanModificationResult,
  Recipe,
} from '@/types'

// Initialize OpenAI client
// The API key comes from the .env file
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Which model to use - can be configured via environment variable
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

/**
 * Extract ingredients from a recipe URL
 *
 * Takes a recipe URL and uses AI to:
 * 1. Fetch the page content
 * 2. Extract the ingredients list
 * 3. Extract the recipe name if possible
 *
 * @param url - The URL of the recipe webpage
 * @returns Object with ingredients (string) and optional name
 * @throws Error if the AI request fails or URL is invalid
 */
export async function extractIngredientsFromURL(
  url: string
): Promise<ExtractedRecipeData> {
  try {
    // Note: For production, you'd want to fetch the URL content server-side
    // and pass it to the AI. For now, we'll ask the AI to describe what it would do.
    const prompt = `You are a recipe extraction assistant. Given a recipe URL, extract the ingredients list and recipe name.

URL: ${url}

Since you cannot fetch URLs directly, I need you to:
1. Tell the user they need to paste the recipe content
2. Explain what ingredients format you're expecting

For now, return a helpful message in the ingredients field.`

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that extracts recipe information from URLs. Return your response as JSON with "ingredients" and "name" fields.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    })

    const result = completion.choices[0]?.message?.content
    if (!result) {
      throw new Error('No response from AI')
    }

    const parsed = JSON.parse(result) as ExtractedRecipeData
    return parsed
  } catch (error) {
    console.error('Error extracting ingredients from URL:', error)
    throw new Error('Failed to extract recipe from URL. Please try again.')
  }
}

/**
 * Extract ingredients from pasted recipe text
 *
 * Takes raw recipe text (pasted by user) and extracts just the ingredients
 * in a clean, formatted list.
 *
 * @param recipeText - The full recipe text pasted by the user
 * @returns Object with extracted ingredients and name
 * @throws Error if the AI request fails
 */
export async function extractIngredientsFromText(
  recipeText: string
): Promise<ExtractedRecipeData> {
  try {
    const prompt = `Extract the ingredients list from this recipe text. Format as a clean list, one ingredient per line.

Recipe text:
${recipeText}

Return JSON with:
- "ingredients": string with one ingredient per line
- "name": the recipe name if you can find it`

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that extracts ingredients from recipe text. Return clean, formatted ingredients. Return your response as JSON.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    })

    const result = completion.choices[0]?.message?.content
    if (!result) {
      throw new Error('No response from AI')
    }

    const parsed = JSON.parse(result) as ExtractedRecipeData
    return parsed
  } catch (error) {
    console.error('Error extracting ingredients from text:', error)
    throw new Error('Failed to extract ingredients. Please try again.')
  }
}

/**
 * Modify a meal plan based on natural language instructions
 *
 * Takes a user instruction like "swap Tuesday for something faster" and:
 * 1. Understands what change is requested
 * 2. Finds a suitable recipe from the available recipes
 * 3. Returns the modified plan
 *
 * @param request - Contains instruction, current plan, and available recipes
 * @returns Modified meal plan with explanation
 * @throws Error if the AI request fails or instruction is unclear
 */
export async function modifyMealPlan(
  request: MealPlanModificationRequest
): Promise<MealPlanModificationResult> {
  try {
    // Format current plan for the AI
    const currentPlanText = request.currentPlan
      .map(
        mp =>
          `${mp.dayOfWeek} (${mp.date.toLocaleDateString()}): ${mp.recipe.name} (${mp.recipe.proteinType}, ${mp.recipe.carbType}, ${mp.recipe.prepTime})`
      )
      .join('\n')

    // Format available recipes for the AI
    const recipesText = request.availableRecipes
      .map(
        r =>
          `ID: ${r.id}, Name: ${r.name}, Protein: ${r.proteinType}, Carb: ${r.carbType}, Prep: ${r.prepTime}, Tier: ${r.tier}`
      )
      .join('\n')

    const prompt = `You are a meal planning assistant. Modify the weekly meal plan based on the user's instruction.

Current meal plan:
${currentPlanText}

Available recipes:
${recipesText}

User instruction: "${request.instruction}"

Rules to follow:
- Weekdays (Mon-Thu) should be quick/medium prep
- Weekends (Fri-Sun) can be any prep time
- Don't repeat same protein on consecutive days
- Don't repeat same carb on consecutive days
- Prefer favorite tier recipes, some non-regular, rarely new

Return JSON with:
- "modifiedPlan": array of {date: ISO date string, recipeId: string} for changed meals only
- "explanation": string explaining what you changed and why`

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful meal planning assistant. Return your response as JSON.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    })

    const result = completion.choices[0]?.message?.content
    if (!result) {
      throw new Error('No response from AI')
    }

    const parsed = JSON.parse(result) as {
      modifiedPlan: { date: string; recipeId: string }[]
      explanation: string
    }

    // Convert date strings back to Date objects
    return {
      modifiedPlan: parsed.modifiedPlan.map(mp => ({
        date: new Date(mp.date),
        recipeId: mp.recipeId,
      })),
      explanation: parsed.explanation,
    }
  } catch (error) {
    console.error('Error modifying meal plan:', error)
    throw new Error('Failed to modify meal plan. Please try again.')
  }
}

/**
 * Generate a weekly meal plan
 *
 * Creates a 7-day meal plan following these rules:
 * - Weekdays (Mon-Thu): Quick/medium prep recipes
 * - Weekends (Fri-Sun): Any prep time, bias toward longer/new recipes
 * - Mix: Mostly favorites, 1-2 non-regular, max 1 new
 * - No consecutive same protein
 * - No consecutive same carb
 *
 * @param recipes - All available recipes to choose from
 * @param startDate - The Monday to start the week from
 * @returns Array of selected recipe IDs for each day (Mon-Sun)
 * @throws Error if not enough suitable recipes or AI request fails
 */
export async function generateWeeklyMealPlan(
  recipes: Recipe[],
  startDate: Date
): Promise<string[]> {
  try {
    // Format recipes for the AI
    const recipesText = recipes
      .map(
        r =>
          `ID: ${r.id}, Name: ${r.name}, Protein: ${r.proteinType}, Carb: ${r.carbType}, Prep: ${r.prepTime}, Tier: ${r.tier}`
      )
      .join('\n')

    const prompt = `You are a meal planning assistant. Generate a 7-day dinner meal plan starting from Monday.

Available recipes:
${recipesText}

Rules:
1. Monday-Thursday: Only quick or medium prep recipes
2. Friday-Sunday: Any prep time, prefer long prep and new recipes
3. Recipe tier distribution: Mostly favorites, 1-2 non-regular, max 1 new
4. No consecutive days with same protein type
5. No consecutive days with same carb type
6. Return exactly 7 recipe IDs in order (Monday to Sunday)

Return JSON with:
- "recipeIds": array of exactly 7 recipe IDs (strings) in order Mon-Sun
- "explanation": brief explanation of the choices`

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful meal planning assistant. Return your response as JSON.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    })

    const result = completion.choices[0]?.message?.content
    if (!result) {
      throw new Error('No response from AI')
    }

    const parsed = JSON.parse(result) as {
      recipeIds: string[]
      explanation: string
    }

    // Validate we got exactly 7 recipe IDs
    if (!parsed.recipeIds || parsed.recipeIds.length !== 7) {
      throw new Error('AI did not return exactly 7 recipes')
    }

    // Validate all recipe IDs exist
    const recipeIdSet = new Set(recipes.map(r => r.id))
    for (const id of parsed.recipeIds) {
      if (!recipeIdSet.has(id)) {
        throw new Error(`Invalid recipe ID returned: ${id}`)
      }
    }

    console.log('Generated meal plan:', parsed.explanation)
    return parsed.recipeIds
  } catch (error) {
    console.error('Error generating meal plan:', error)
    throw new Error('Failed to generate meal plan. Please try again.')
  }
}
