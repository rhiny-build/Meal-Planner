/**
 * Unified AI Configuration
 *
 * Centralises temperature, token limits, and other settings for all AI
 * functions. Tune behaviour here without touching business logic or prompts.
 */

export const AI_CONFIG = {
  modifyMealPlan: {
    temperature: 0.2,
    max_completion_tokens: 4000,
  },
  normaliseIngredients: {},
  matchIngredients: {},
  extractIngredients: {},
} as const

/** Maximum HTML characters sent to the AI for ingredient extraction */
export const EXTRACT_HTML_MAX_LENGTH = 15_000
