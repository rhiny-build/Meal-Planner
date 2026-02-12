/**
 * AI Abstraction Layer
 *
 * This module provides a clean interface for all AI operations in the app.
 * Currently uses OpenAI, but is designed to be easily swappable with Claude
 * or other AI providers in the future.
 *
 * TO SWITCH TO CLAUDE API:
 * 1. Install the Anthropic SDK: npm install @anthropic-ai/sdk
 * 2. Update lib/ai/client.ts with the Claude client
 * 3. Update each function file to use Claude's API format
 * 4. Update the .env file with ANTHROPIC_API_KEY
 *
 * The function signatures (inputs and outputs) remain the same,
 * so the rest of the app won't need to change.
 */

export { extractIngredientsFromURL } from './extractIngredientsFromURL'
export { modifyMealPlan } from './modifyMealPlan'
export { normaliseIngredients } from './normaliseIngredients'
export type { NormalisationInput, NormalisationResult } from './normaliseIngredients'
