import { describe, it, expect, vi, beforeEach } from 'vitest'

const prismaMock = vi.hoisted(() => ({ recipeStep: { count: vi.fn() } }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
const write = vi.hoisted(() => vi.fn(async () => ({ id: 'r1' })))
vi.mock('@/lib/recipeWrite', () => ({
  updateRecipeFromForm: write,
  RecipeValidationError: class extends Error {},
}))

import { MethodAlreadyExistsError, saveCapturedMethod } from './saveMethod'

beforeEach(() => vi.clearAllMocks())

describe('saveCapturedMethod', () => {
  it('should write the steps through the recipe write path when the recipe has none', async () => {
    prismaMock.recipeStep.count.mockResolvedValue(0)
    await saveCapturedMethod('r1', [
      { text: ' Fry onions. ', timerSeconds: 300 },
      { text: '   ', timerSeconds: null },
    ])
    expect(write).toHaveBeenCalledWith(expect.anything(), 'r1', {
      steps: [{ text: ' Fry onions. ', timerSeconds: 300 }],
    })
  })

  it('should never overwrite a recipe that already has steps', async () => {
    prismaMock.recipeStep.count.mockResolvedValue(2)
    await expect(saveCapturedMethod('r1', [{ text: 'x', timerSeconds: null }])).rejects.toThrow(MethodAlreadyExistsError)
    expect(write).not.toHaveBeenCalled()
  })

  it('should refuse an empty method', async () => {
    await expect(saveCapturedMethod('r1', [{ text: ' ', timerSeconds: null }])).rejects.toThrow(/at least one step/)
    expect(write).not.toHaveBeenCalled()
  })
})
