import { describe, it, expect, vi } from 'vitest'

// Mock the OpenAI client so it doesn't require an API key at import time
vi.mock('./client', () => ({
  openai: { embeddings: { create: vi.fn() } },
}))

import { cosineSimilarity, findBestMatches } from './embeddings'

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
