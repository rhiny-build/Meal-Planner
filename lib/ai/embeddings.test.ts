import { describe, it, expect, vi } from 'vitest'

// Mock the OpenAI client so it doesn't require an API key at import time
vi.mock('./client', () => ({
  openai: { embeddings: { create: vi.fn() } },
}))

import { cosineSimilarity, findBestMatches, deduplicateByEmbedding } from './embeddings'

describe('cosineSimilarity', () => {
  it('should return 1 for identical vectors', () => {
    const v = [1, 2, 3]
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0)
  })

  it('should return 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0)
  })

  it('should return -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0)
  })

  it('should return 0 when a vector is all zeros', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0)
  })

  it('should compute known similarity value', () => {
    // cos([1,2,3], [4,5,6]) = 32 / (sqrt(14) * sqrt(77)) ≈ 0.9746
    expect(cosineSimilarity([1, 2, 3], [4, 5, 6])).toBeCloseTo(0.9746, 3)
  })

  it('should be insensitive to vector magnitude', () => {
    const a = [1, 2, 3]
    const b = [2, 4, 6] // same direction, 2x magnitude
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0)
  })
})

describe('findBestMatches', () => {
  // Use simple 3D vectors for clarity
  const masterItems = [
    { name: 'salt', embedding: [1, 0, 0] },
    { name: 'pepper', embedding: [0, 1, 0] },
    { name: 'sugar', embedding: [0, 0, 1] },
  ]

  it('should match ingredient to closest master item above threshold', () => {
    const ingredientEmbeddings = [
      [0.95, 0.05, 0], // very close to salt
    ]

    const result = findBestMatches(ingredientEmbeddings, masterItems, 0.9)
    expect(result).toEqual(['salt'])
  })

  it('should return null when no master item meets threshold', () => {
    const ingredientEmbeddings = [
      [0.5, 0.5, 0.5], // equidistant from all — similarity ~0.577
    ]

    const result = findBestMatches(ingredientEmbeddings, masterItems, 0.9)
    expect(result).toEqual([null])
  })

  it('should handle multiple ingredients', () => {
    const ingredientEmbeddings = [
      [0.98, 0.02, 0],  // salt
      [0.3, 0.3, 0.3],  // no match
      [0, 0, 0.99],     // sugar
    ]

    const result = findBestMatches(ingredientEmbeddings, masterItems, 0.9)
    expect(result).toEqual(['salt', null, 'sugar'])
  })

  it('should return all nulls when master list is empty', () => {
    const result = findBestMatches([[1, 0, 0]], [], 0.9)
    expect(result).toEqual([null])
  })

  it('should return empty array when no ingredients', () => {
    const result = findBestMatches([], masterItems, 0.9)
    expect(result).toEqual([])
  })
})

describe('deduplicateByEmbedding', () => {
  it('should merge items above threshold, keeping shortest name', () => {
    const items = [
      { name: 'Chicken Breast', sources: ['Recipe A'] },
      { name: 'Chicken Breast Fillets', sources: ['Recipe B'] },
    ]
    // Nearly identical direction
    const embeddings = [
      [0.95, 0.05, 0],
      [0.94, 0.06, 0],
    ]

    const result = deduplicateByEmbedding(items, embeddings, 0.9)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toBe('Chicken Breast')
    expect(result.items[0].sources).toEqual(['Recipe A', 'Recipe B'])
    expect(result.embeddings).toHaveLength(1)
    expect(result.mergeLog).toHaveLength(1)
  })

  it('should keep items below threshold separate', () => {
    const items = [
      { name: 'chicken', sources: ['Recipe A'] },
      { name: 'garlic', sources: ['Recipe B'] },
    ]
    // Orthogonal vectors — similarity ~0
    const embeddings = [
      [1, 0, 0],
      [0, 1, 0],
    ]

    const result = deduplicateByEmbedding(items, embeddings, 0.9)

    expect(result.items).toHaveLength(2)
    expect(result.mergeLog).toHaveLength(0)
  })

  it('should handle transitive clusters (A~B, B~C → all merge)', () => {
    const items = [
      { name: 'parsley', sources: ['Recipe A'] },
      { name: 'Fresh parsley', sources: ['Recipe B'] },
      { name: 'Chopped parsley', sources: ['Recipe C'] },
    ]
    // All close to each other in embedding space
    const embeddings = [
      [0.95, 0.05, 0],
      [0.93, 0.07, 0],
      [0.92, 0.08, 0],
    ]

    const result = deduplicateByEmbedding(items, embeddings, 0.9)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toBe('parsley') // shortest
    expect(result.items[0].sources).toEqual(['Recipe A', 'Recipe B', 'Recipe C'])
  })

  it('should return single item as-is', () => {
    const items = [{ name: 'rice', sources: ['Recipe A'] }]
    const embeddings = [[1, 0, 0]]

    const result = deduplicateByEmbedding(items, embeddings, 0.9)

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toEqual(items[0])
    expect(result.mergeLog).toHaveLength(0)
  })

  it('should return empty for empty input', () => {
    const result = deduplicateByEmbedding([], [], 0.9)

    expect(result.items).toHaveLength(0)
    expect(result.embeddings).toHaveLength(0)
    expect(result.mergeLog).toHaveLength(0)
  })

  it('should deduplicate sources when merging', () => {
    const items = [
      { name: 'Carrot', sources: ['Soup', 'Stew'] },
      { name: 'Carrots', sources: ['Stew', 'Salad'] },
    ]
    const embeddings = [
      [0.95, 0.05, 0],
      [0.94, 0.06, 0],
    ]

    const result = deduplicateByEmbedding(items, embeddings, 0.9)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toBe('Carrot')
    // 'Stew' should appear only once
    expect(result.items[0].sources).toEqual(['Soup', 'Stew', 'Salad'])
  })

  it('should use canonical item embedding for merged cluster', () => {
    const items = [
      { name: 'Chicken Breast', sources: ['A'] },
      { name: 'Chicken Breast Fillets', sources: ['B'] },
    ]
    const emb1 = [0.95, 0.05, 0]
    const emb2 = [0.94, 0.06, 0]

    const result = deduplicateByEmbedding(items, [emb1, emb2], 0.9)

    // Should use embedding of the canonical (shortest name) item
    expect(result.embeddings[0]).toBe(emb1)
  })
})
