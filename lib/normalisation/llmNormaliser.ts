/**
 * LLM-based ingredient normalisation fallback.
 *
 * Calls OpenAI to normalise ingredient names that the deterministic
 * normaliser couldn't handle confidently (synonyms, regional names, etc.).
 */

import { openai, MODEL } from '../ai/client'
import { SYSTEM_PROMPTS } from '../ai/prompts'
import type { NormalisedResult } from './normalise'

export async function llmNormalise(raw: string): Promise<NormalisedResult> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPTS.normaliseIngredientSingle },
      { role: 'user', content: raw },
    ],
  })

  let content = response.choices[0]?.message?.content?.trim()
  if (!content) {
    throw new Error(`LLM returned empty response for "${raw}"`)
  }

  // Strip markdown fences if the LLM wraps the JSON in ```json ... ```
  content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/,'')

  // Extract first JSON object — LLM sometimes returns extra text or multiple objects
  const jsonMatch = content.match(/\{[\s\S]*?\}/)
  if (!jsonMatch) {
    throw new Error(`LLM returned non-JSON for "${raw}": ${content.slice(0, 100)}`)
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    canonical: string
    base: string
    form: string | null
  }

  return {
    canonical: parsed.canonical,
    base: parsed.base,
    form: parsed.form,
    confident: true,
  }
}
