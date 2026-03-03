/**
 * Match recipe ingredients against master list items using embeddings.
 *
 * Batch-embeds recipe ingredients, then computes cosine similarity against
 * pre-computed master list embeddings. Replaces the previous LLM chat
 * completion approach (~51s → ~1-2s).
 */

import { computeEmbeddings, findBestMatches } from './embeddings'

export type MasterItemWithEmbedding = {
  id: string
  canonicalName: string
  embedding: number[]
}

export type MatchInput = {
  recipeIngredients: string[]
  masterItems: MasterItemWithEmbedding[]
  precomputedEmbeddings?: number[][] // skip embedding API call if provided
}

export type MatchResultItem = {
  index: number
  name: string
  canonicalName: string
  matchedMasterItem: string | null // null = needs buying, string = already covered
  masterItemId: string | null      // FK to MasterListItem
  bestScore: number        // cosine similarity of best match (for debugging)
  bestCandidate: string | null // closest master item regardless of threshold
}

export async function matchIngredientsAgainstMasterList(
  input: MatchInput
): Promise<MatchResultItem[]> {
  if (input.recipeIngredients.length === 0) return []
  if (input.masterItems.length === 0) {
    return input.recipeIngredients.map((name, index) => ({
      index,
      name,
      canonicalName: name.toLowerCase(),
      matchedMasterItem: null,
      masterItemId: null,
      bestScore: 0,
      bestCandidate: null,
    }))
  }

  // Use precomputed embeddings if available, otherwise batch-embed
  const ingredientEmbeddings = input.precomputedEmbeddings
    ?? await computeEmbeddings(input.recipeIngredients)

  // Find best match for each ingredient using cosine similarity
  const matches = findBestMatches(
    ingredientEmbeddings,
    input.masterItems.map((item) => ({
      id: item.id,
      name: item.canonicalName,
      embedding: item.embedding,
    })),
  )

  return input.recipeIngredients.map((name, index) => ({
    index,
    name,
    canonicalName: name.toLowerCase(),
    matchedMasterItem: matches[index].match,
    masterItemId: matches[index].matchId,
    bestScore: matches[index].bestScore,
    bestCandidate: matches[index].bestCandidate,
  }))
}
