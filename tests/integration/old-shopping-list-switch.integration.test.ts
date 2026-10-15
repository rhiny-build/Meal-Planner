/**
 * Old shopping list switch: off by default, stored in SystemSetting.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './setup'
import { getShowOldShoppingList, setShowOldShoppingList } from '@/app/(modules)/settings/preferenceActions'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('Old shopping list switch', () => {
  beforeAll(async () => { await setupTestDatabase() })
  afterAll(async () => { await teardownTestDatabase() })
  beforeEach(async () => { await clearTestDatabase() })

  it('is off by default, turns on and off again', async () => {
    expect(await getShowOldShoppingList()).toBe(false)
    await setShowOldShoppingList(true)
    expect(await getShowOldShoppingList()).toBe(true)
    await setShowOldShoppingList(false)
    expect(await getShowOldShoppingList()).toBe(false)
  })
})
