import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import path from 'path'

/** The temporary /api/env-check diagnostic route was removed; it must not come back. */
describe('API routes', () => {
  it('has no env-check diagnostic route', () => {
    expect(existsSync(path.join(__dirname, 'env-check'))).toBe(false)
  })
})
