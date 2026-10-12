/**
 * Unified AI Configuration
 *
 * Centralises temperature, token limits, and other settings for all AI
 * functions. Tune behaviour here without touching business logic or prompts.
 */

/** Claude model choices. Change models here only. */
export const CLAUDE_MODELS = {
  /** Agentic / reasoning-heavy work (planning, extraction, discovery) */
  agent: 'claude-sonnet-5-5',
  /** Cheap, high-volume calls (ingredient normalisation) */
  cheap: 'claude-haiku-5-5',
} as const

export const AI_CONFIG = {
  modifyMealPlan: {
    model: CLAUDE_MODELS.agent,
    maxTokens: 4000,
  },
  normaliseIngredients: {
    model: CLAUDE_MODELS.cheap,
    maxTokens: 4000,
  },
  normaliseIngredientSingle: {
    model: CLAUDE_MODELS.cheap,
    maxTokens: 300,
  },
  recipeImporter: {
    model: CLAUDE_MODELS.agent,
    maxTokens: 8000,
    /** Guard for the agent loop: most imports take 3-4 turns */
    maxTurns: 8,
  },
  discoverRecipes: {
    model: CLAUDE_MODELS.agent,
    maxTokens: 4000,
    webSearchMaxUses: 5,
  },
  embeddings: {
    model: 'text-embedding-3-small' as const,
    autoMatchThreshold: 0.90,  // ≥ this: auto-resolve + write mapping
    suggestionThreshold: 0.65, // ≥ this (and < auto): surface as suggestion for user review
  },
} as const

/** Maximum characters of page text the recipe importer's fetch_page tool returns */
export const EXTRACT_HTML_MAX_LENGTH = 15_000
