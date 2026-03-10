/**
 * Single entry point for ingredient normalisation.
 *
 * Pipeline:
 * 1. Deterministic rules (normaliseName)
 * 2. If not confident and USE_LLM is enabled → call LLM
 *
 * Set env var USE_LLM=true to enable the LLM fallback.
 */

import { normaliseName } from './normalise'
import type { NormalisedResult } from './normalise'

export async function normaliseIngredient(
  raw: string
): Promise<NormalisedResult> {
  // 1. Deterministic normalisation
  const result = normaliseName(raw)
  if (result.confident) {
    return result
  }

  // 2. LLM fallback (only if enabled)
  if (!process.env.USE_LLM) {
    return result
  }

  // Lazy-import to avoid loading OpenAI when LLM is disabled
  const { llmNormalise } = await import('./llmNormaliser')
  return llmNormalise(raw)
}

/**
 * Production wrapper that adds DB caching around normaliseIngredient.
 * Avoids repeat LLM calls for the same input.
 */
export async function normaliseIngredientCached(
  raw: string
): Promise<NormalisedResult> {
  // 1. Deterministic — no cache needed, it's instant
  const result = normaliseName(raw)
  if (result.confident) {
    return result
  }

  // 2. Check cache before hitting LLM
  const { prisma } = await import('../prisma')
  const cacheKey = raw.toLowerCase().trim()
  const cached = await prisma.normalisationCache.findUnique({
    where: { input: cacheKey },
  })

  if (cached) {
    return {
      canonical: cached.canonical,
      base: cached.base,
      form: cached.form,
      confident: true,
    }
  }

  // 3. LLM fallback (only if enabled)
  if (!process.env.USE_LLM) {
    return result
  }

  const { llmNormalise } = await import('./llmNormaliser')
  const llmResult = await llmNormalise(raw)

  // 4. Cache the result
  await prisma.normalisationCache.upsert({
    where: { input: cacheKey },
    create: {
      input: cacheKey,
      canonical: llmResult.canonical,
      base: llmResult.base,
      form: llmResult.form,
    },
    update: {
      canonical: llmResult.canonical,
      base: llmResult.base,
      form: llmResult.form,
    },
  })

  return llmResult
}
