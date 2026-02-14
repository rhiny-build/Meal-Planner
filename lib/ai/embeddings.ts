/**
 * Embedding utilities for ingredient matching.
 *
 * Pre-compute embeddings for master list items (stored in DB),
 * batch-embed recipe ingredients at sync time, and compute
 * cosine similarity in JS — replaces the slow LLM matching call.
 */

import { openai } from './client'
import { AI_CONFIG } from './config'

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

/**
 * Item shape expected by deduplicateByEmbedding.
 * Matches AggregatedItem from shoppingListHelpers.
 */
export type DeduplicableItem = {
  name: string
  sources: string[]
}

export type DeduplicationResult = {
  items: DeduplicableItem[]
  embeddings: number[][]
  mergeLog: string[]
  nearMissLog: string[]
}

/**
 * Cluster semantically similar ingredients using embedding cosine similarity.
 * Uses centroid-based clustering: each item is compared to existing cluster
 * centroids and either joins the best match or starts a new cluster.
 * Merges each cluster into a single item with the shortest name and combined sources.
 */
export function deduplicateByEmbedding(
  items: DeduplicableItem[],
  embeddings: number[][],
  threshold: number = AI_CONFIG.embeddings.deduplicationThreshold,
): DeduplicationResult {
  if (items.length <= 1) {
    return { items: [...items], embeddings: [...embeddings], mergeLog: [], nearMissLog: [] }
  }

  type Cluster = {
    indices: number[]
    centroid: number[]
  }

  const clusters: Cluster[] = []
  const mergeLog: string[] = []
  const nearMissLog: string[] = []
  const NEAR_MISS_FLOOR = 0.75

  for (let i = 0; i < items.length; i++) {
    const currentVec = embeddings[i]
    let bestClusterIndex = -1
    let bestScore = 0

    // Find most similar existing cluster
    for (let c = 0; c < clusters.length; c++) {
      const score = cosineSimilarity(currentVec, clusters[c].centroid)
      if (score > bestScore) {
        bestScore = score
        bestClusterIndex = c
      }
    }

    // Join cluster or create new one
    if (bestClusterIndex !== -1 && bestScore >= threshold) {
      const cluster = clusters[bestClusterIndex]

      mergeLog.push(
        `"${items[i].name}" → cluster ${bestClusterIndex} (score: ${bestScore.toFixed(4)})`
      )

      cluster.indices.push(i)

      // Recompute centroid (average vector)
      const dim = currentVec.length
      const newCentroid = new Array(dim).fill(0)
      for (const idx of cluster.indices) {
        const vec = embeddings[idx]
        for (let d = 0; d < dim; d++) {
          newCentroid[d] += vec[d]
        }
      }
      for (let d = 0; d < dim; d++) {
        newCentroid[d] /= cluster.indices.length
      }
      cluster.centroid = newCentroid
    } else {
      if (bestClusterIndex !== -1 && bestScore >= NEAR_MISS_FLOOR) {
        nearMissLog.push(
          `"${items[i].name}" ~ cluster ${bestClusterIndex} (score: ${bestScore.toFixed(4)})`
        )
      }
      clusters.push({ indices: [i], centroid: currentVec })
    }
  }

  // Convert clusters to output structure
  const mergedItems: DeduplicableItem[] = []
  const mergedEmbeddings: number[][] = []

  for (const cluster of clusters) {
    const indices = cluster.indices

    // Pick shortest name as canonical
    let canonicalIdx = indices[0]
    for (const idx of indices) {
      if (items[idx].name.length < items[canonicalIdx].name.length) {
        canonicalIdx = idx
      }
    }

    // Merge sources
    const combinedSources: string[] = []
    for (const idx of indices) {
      for (const src of items[idx].sources) {
        if (!combinedSources.includes(src)) {
          combinedSources.push(src)
        }
      }
    }

    mergedItems.push({ name: items[canonicalIdx].name, sources: combinedSources })
    mergedEmbeddings.push(embeddings[canonicalIdx])
  }

  return { items: mergedItems, embeddings: mergedEmbeddings, mergeLog, nearMissLog }
}

export type MatchDetail = {
  match: string | null
  bestScore: number
  bestCandidate: string | null // closest master item name regardless of threshold
}

/**
 * Find the best matching master list item for each recipe ingredient.
 * Returns match details including similarity score for debugging.
 */
export function findBestMatches(
  ingredientEmbeddings: number[][],
  masterItems: { name: string; embedding: number[] }[],
  threshold: number = AI_CONFIG.embeddings.similarityThreshold,
): MatchDetail[] {
  return ingredientEmbeddings.map((ingredientVec) => {
    let bestScore = -1
    let bestCandidate: string | null = null

    for (const master of masterItems) {
      const score = cosineSimilarity(ingredientVec, master.embedding)
      if (score > bestScore) {
        bestScore = score
        bestCandidate = master.name
      }
    }

    return {
      match: bestScore >= threshold ? bestCandidate : null,
      bestScore,
      bestCandidate,
    }
  })
}
