/**
 * Suggestion Actions Tests
 *
 * Tests for confirm, reassign, and reject suggestion server actions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock the actions module to avoid transitive AI client imports
vi.mock('./actions', () => ({
  createIngredientMapping: vi.fn(),
}))

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    shoppingListItem: {
      findUniqueOrThrow: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    rejectedSuggestion: {
      upsert: vi.fn(),
    },
  },
}))

// Import after mocking
import { confirmSuggestion, reassignSuggestion, rejectSuggestion } from './suggestionActions'
import { createIngredientMapping } from './actions'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

const mockCreateIngredientMapping = createIngredientMapping as ReturnType<typeof vi.fn>

const mockPrisma = prisma as unknown as {
  shoppingListItem: {
    findUniqueOrThrow: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  rejectedSuggestion: {
    upsert: ReturnType<typeof vi.fn>
  }
}

const mockItem = {
  id: 'item-1',
  name: 'garlic cloves',
  matchConfidence: 'pending',
  masterItemId: 'master-1',
  similarityScore: 0.78,
  shoppingListId: 'list-1',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.shoppingListItem.findUniqueOrThrow.mockResolvedValue(mockItem)
  mockPrisma.shoppingListItem.delete.mockResolvedValue(mockItem)
  mockPrisma.shoppingListItem.update.mockResolvedValue(mockItem)
  mockCreateIngredientMapping.mockResolvedValue({ id: 'mapping-1' })
  mockPrisma.rejectedSuggestion.upsert.mockResolvedValue({ id: 'rejection-1' })
})

describe('confirmSuggestion', () => {
  it('should write mapping and delete shopping list item', async () => {
    await confirmSuggestion('item-1', 'master-1')

    // Should look up the item to get its name
    expect(mockPrisma.shoppingListItem.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'item-1' },
    })

    // Should write mapping via createIngredientMapping
    expect(mockCreateIngredientMapping).toHaveBeenCalledWith('garlic cloves', 'master-1')

    // Should delete the shopping list item
    expect(mockPrisma.shoppingListItem.delete).toHaveBeenCalledWith({
      where: { id: 'item-1' },
    })

    expect(revalidatePath).toHaveBeenCalledWith('/shopping-list')
  })
})

describe('reassignSuggestion', () => {
  it('should write mapping with new master item and delete shopping list item', async () => {
    await reassignSuggestion('item-1', 'master-99')

    // Should look up the item
    expect(mockPrisma.shoppingListItem.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'item-1' },
    })

    // Should write mapping with the NEW master item
    expect(mockCreateIngredientMapping).toHaveBeenCalledWith('garlic cloves', 'master-99')

    // Should delete the shopping list item
    expect(mockPrisma.shoppingListItem.delete).toHaveBeenCalledWith({
      where: { id: 'item-1' },
    })

    expect(revalidatePath).toHaveBeenCalledWith('/shopping-list')
  })
})

describe('rejectSuggestion', () => {
  it('should record rejection and update item to unmatched', async () => {
    await rejectSuggestion('item-1', 'master-1', 'garlic (fresh)')

    // Should create rejection record (idempotent upsert)
    expect(mockPrisma.rejectedSuggestion.upsert).toHaveBeenCalledWith({
      where: {
        normalisedName_masterItemId: {
          normalisedName: 'garlic (fresh)',
          masterItemId: 'master-1',
        },
      },
      create: { normalisedName: 'garlic (fresh)', masterItemId: 'master-1' },
      update: {},
    })

    // Should update item: pending → unmatched, clear master item
    expect(mockPrisma.shoppingListItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: {
        matchConfidence: 'unmatched',
        masterItemId: null,
        similarityScore: null,
      },
    })

    expect(revalidatePath).toHaveBeenCalledWith('/shopping-list')
  })

  it('should not delete the shopping list item (it stays on the list)', async () => {
    await rejectSuggestion('item-1', 'master-1', 'garlic (fresh)')

    expect(mockPrisma.shoppingListItem.delete).not.toHaveBeenCalled()
  })

  it('should be idempotent — duplicate rejection does not error', async () => {
    // Simulate duplicate: upsert returns existing record (no error)
    mockPrisma.rejectedSuggestion.upsert.mockResolvedValue({
      id: 'existing-rejection',
      normalisedName: 'garlic (fresh)',
      masterItemId: 'master-1',
    })

    await expect(
      rejectSuggestion('item-1', 'master-1', 'garlic (fresh)')
    ).resolves.not.toThrow()

    expect(mockPrisma.rejectedSuggestion.upsert).toHaveBeenCalledTimes(1)
  })
})
