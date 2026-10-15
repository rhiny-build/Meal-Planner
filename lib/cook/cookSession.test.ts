import { describe, it, expect, beforeEach } from 'vitest'
import {
  COOK_SESSION_KEY,
  COOK_SESSION_MAX_AGE_MS,
  clearCookSession,
  getResumableSession,
  loadCookSession,
  parseCookSession,
  saveCookSession,
  shouldSaveSession,
  type CookSession,
} from './cookSession'

const NOW = 1_800_000_000_000
const session = (overrides: Partial<CookSession> = {}): CookSession => ({
  recipeId: 'r1',
  recipeName: 'Sea Bass',
  servings: 4,
  stepIndex: 2,
  timers: { s1: { status: 'running', totalMs: 600_000, remainingMs: 600_000, endsAt: NOW + 300_000 } },
  updatedAt: NOW - 1000,
  ...overrides,
})

describe('parseCookSession', () => {
  it('keeps a good session, timers included (by end time)', () => {
    expect(parseCookSession(JSON.parse(JSON.stringify(session())), NOW)).toEqual(session())
  })

  it('expires a session more than 12 hours old, but not one just under', () => {
    expect(parseCookSession(session({ updatedAt: NOW - COOK_SESSION_MAX_AGE_MS - 1 }), NOW)).toBeNull()
    expect(parseCookSession(session({ updatedAt: NOW - COOK_SESSION_MAX_AGE_MS }), NOW)).not.toBeNull()
  })

  it.each([
    ['nothing', null],
    ['no recipe', { ...session(), recipeId: '' }],
    ['no time stamp', { ...session(), updatedAt: 'yesterday' }],
    ['zero servings', { ...session(), servings: 0 }],
    ['a fractional step', { ...session(), stepIndex: 1.5 }],
    ['a negative step', { ...session(), stepIndex: -1 }],
  ])('rejects %s', (_label, raw) => {
    expect(parseCookSession(raw, NOW)).toBeNull()
  })

  it('drops a broken timer but keeps the rest', () => {
    const raw = {
      ...session(),
      timers: {
        good: { status: 'paused', totalMs: 1000, remainingMs: 400, endsAt: null },
        noEnd: { status: 'running', totalMs: 1000, remainingMs: 400, endsAt: null },
        junk: { status: 'flying' },
      },
    }
    expect(Object.keys(parseCookSession(raw, NOW)!.timers)).toEqual(['good'])
  })

  it('keeps a timer that ended while away, so it can alert on return', () => {
    const ended = { s1: { status: 'running', totalMs: 1000, remainingMs: 1000, endsAt: NOW - 5000 } }
    expect(parseCookSession({ ...session(), timers: ended }, NOW)!.timers.s1.endsAt).toBe(NOW - 5000)
  })
})

describe('getResumableSession', () => {
  it('resumes only the recipe that was being cooked', () => {
    expect(getResumableSession(session(), 'r1')).not.toBeNull()
    expect(getResumableSession(session(), 'other')).toBeNull()
    expect(getResumableSession(null, 'r1')).toBeNull()
  })
})

describe('shouldSaveSession', () => {
  it('saves full-screen cook mode from the start', () => {
    expect(shouldSaveSession({ stepIndex: 0, timers: {} }, false)).toBe(true)
  })

  it('saves the embedded Method tab only once you moved on or started a timer', () => {
    expect(shouldSaveSession({ stepIndex: 0, timers: {} }, true)).toBe(false)
    expect(shouldSaveSession({ stepIndex: 1, timers: {} }, true)).toBe(true)
    expect(shouldSaveSession({ stepIndex: 0, timers: session().timers }, true)).toBe(true)
  })
})

describe('browser storage', () => {
  beforeEach(() => window.localStorage.clear())

  it('saves, loads and clears one session', () => {
    saveCookSession(session())
    expect(loadCookSession(NOW)).toEqual(session())
    clearCookSession()
    expect(loadCookSession(NOW)).toBeNull()
  })

  it('a new session replaces the old one', () => {
    saveCookSession(session())
    saveCookSession(session({ recipeId: 'r2', recipeName: 'Keema' }))
    expect(loadCookSession(NOW)!.recipeId).toBe('r2')
  })

  it('removes an expired session when it finds one', () => {
    saveCookSession(session({ updatedAt: NOW - COOK_SESSION_MAX_AGE_MS - 1 }))
    expect(loadCookSession(NOW)).toBeNull()
    expect(window.localStorage.getItem(COOK_SESSION_KEY)).toBeNull()
  })

  it('treats unreadable storage as no session', () => {
    window.localStorage.setItem(COOK_SESSION_KEY, '{not json')
    expect(loadCookSession(NOW)).toBeNull()
  })
})
