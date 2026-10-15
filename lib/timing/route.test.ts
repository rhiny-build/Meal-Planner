import { describe, it, expect } from 'vitest'
import { normaliseRoute } from './route'

describe('normaliseRoute', () => {
  it('drops the query string and keeps plain pages', () => {
    expect(normaliseRoute('/meal-plan?day=Tuesday')).toBe('/meal-plan')
    expect(normaliseRoute('/')).toBe('/')
    expect(normaliseRoute('')).toBe('/')
  })

  it('turns ids and dates into placeholders so one page is one row', () => {
    expect(normaliseRoute('/recipes/clx0abcdefghijklmnopqrstu')).toBe('/recipes/:id')
    expect(normaliseRoute('/recipes/clx0abcdefghijklmnopqrstu/cook')).toBe('/recipes/:id/cook')
    expect(normaliseRoute('/api/meal-plan/2026-10-12')).toBe('/api/meal-plan/:id')
  })

  it('caps the length', () => {
    expect(normaliseRoute('/' + 'z'.repeat(300)).length).toBe(80)
  })
})
