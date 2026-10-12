/**
 * AI Abstraction Layer
 *
 * This module provides a clean interface for all AI operations in the app.
 * All generative calls run on Claude (see claude.ts and config.ts).
 * OpenAI is used for embeddings only (see openaiEmbeddings.ts).
 *
 * Function signatures (inputs and outputs) are provider-independent,
 * so the rest of the app doesn't depend on the provider.
 */

export { extractIngredientsFromURL } from './extractIngredientsFromURL'
export { modifyMealPlan } from './modifyMealPlan'
export { normaliseMasterItems } from '../shopping-list/normaliseMasterItem'
export type { NormalisationInput, NormalisationResult } from '../shopping-list/normaliseMasterItem'
