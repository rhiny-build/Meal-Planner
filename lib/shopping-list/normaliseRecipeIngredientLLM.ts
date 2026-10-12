/**
 * LLM-based ingredient normalisation fallback.
 *
 * Calls Claude (cheap model, forced tool) to normalise ingredient names that
 * the deterministic normaliser couldn't handle confidently (synonyms,
 * regional names, etc.).
 */

import { callForcedTool } from '../ai/claude'
import { AI_CONFIG } from '../ai/config'
import { SYSTEM_PROMPTS } from '../ai/prompts'
import { NORMALISE_SINGLE_SCHEMA } from '../ai/schemas'
import type { NormalisedResult } from './normaliseRecipeIngredient'

export async function llmNormalise(raw: string): Promise<NormalisedResult> {
  const parsed = await callForcedTool<{
    canonical: string
    base: string
    form: string | null
  }>({
    model: AI_CONFIG.normaliseIngredientSingle.model,
    maxTokens: AI_CONFIG.normaliseIngredientSingle.maxTokens,
    system: SYSTEM_PROMPTS.normaliseIngredientSingle,
    prompt: raw,
    toolName: 'record_normalised_ingredient',
    toolDescription: 'Record the canonical, base and form of the ingredient.',
    schema: NORMALISE_SINGLE_SCHEMA,
  })

  if (!parsed.canonical || !parsed.base) {
    throw new Error(`LLM returned incomplete result for "${raw}"`)
  }

  return {
    canonical: parsed.canonical,
    base: parsed.base,
    form: parsed.form ?? null,
    confident: true,
  }
}
