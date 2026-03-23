/**
 * Embedding utilities for ingredient matching.
 *
 * Pre-compute embeddings for master list items (stored in DB),
 * batch-embed recipe ingredients at sync time, and compute
 * cosine similarity in JS — replaces the slow LLM matching call.
 */

import { openai } from '../ai/client'
import { AI_CONFIG } from '../ai/config'

/**
 * Compute embeddings for a batch of texts using OpenAI's embedding API.
 * Returns one vector per input text, in the same order.
 */
export async function computeEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const response = await openai.embeddings.create({
    model: AI_CONFIG.embeddings.model,
    input: texts,
  })

  // OpenAI returns embeddings in the same order as input
  return response.data.map((item) => item.embedding)
}

/**
 * Cosine similarity between two vectors.
 * Returns a value between -1 and 1, where 1 = identical direction.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0

  return dot / denominator
}

export type MatchDetail = {
  match: string | null
  matchId: string | null   // ID of the matched master item
  bestScore: number
  bestCandidate: string | null // closest master item name regardless of threshold
}

/**
 * Find the best matching master list item for each recipe ingredient.
 * Returns match details including similarity score for debugging.
 */
export function findBestMatches(
  ingredientEmbeddings: number[][],
  masterItems: { id: string; name: string; embedding: number[] }[],
  threshold: number = AI_CONFIG.embeddings.suggestionThreshold,
): MatchDetail[] {
  return ingredientEmbeddings.map((ingredientVec) => {
    let bestScore = -1
    let bestCandidate: string | null = null
    let bestId: string | null = null

    for (const master of masterItems) {
      const score = cosineSimilarity(ingredientVec, master.embedding)
      if (score > bestScore) {
        bestScore = score
        bestCandidate = master.name
        bestId = master.id
      }
    }

    return {
      match: bestScore >= threshold ? bestCandidate : null,
      matchId: bestScore >= threshold ? bestId : null,
      bestScore,
      bestCandidate,
    }
  })
}
