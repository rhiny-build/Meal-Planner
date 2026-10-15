/**
 * Cook session (where you are in cook mode)
 *
 * One cooking session is kept in the browser's storage so leaving the app
 * (a phone call, another app, a reload) does not lose your place: the recipe,
 * servings, current step and every timer (by the time it ends, so they keep
 * running while away). Only one recipe is cooked at a time, so a new session
 * replaces the old one.
 *
 * It ends when you leave cook mode on purpose (Close, Finish, Done) and it
 * expires 12 hours after the last change. The rules are pure functions that
 * take `now`; the small storage layer at the bottom never throws.
 */

import type { CookTimer, CookTimerMap } from './cookTimers'

export const COOK_SESSION_KEY = 'mealPlanner.cookSession'
export const COOK_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000

export type CookSession = {
  recipeId: string
  recipeName: string
  servings: number
  stepIndex: number
  timers: CookTimerMap
  /** When the session was last saved (ms since 1970). */
  updatedAt: number
}

const TIMER_STATUSES = ['running', 'paused', 'done']

function parseTimer(raw: unknown): CookTimer | null {
  const timer = raw as Partial<CookTimer> | null
  if (!timer || typeof timer !== 'object') return null
  if (!TIMER_STATUSES.includes(timer.status as string)) return null
  if (!Number.isFinite(timer.totalMs) || !Number.isFinite(timer.remainingMs)) return null
  const endsAt = timer.endsAt === null || timer.endsAt === undefined ? null : Number(timer.endsAt)
  if (endsAt !== null && !Number.isFinite(endsAt)) return null
  if (timer.status === 'running' && endsAt === null) return null
  return { status: timer.status!, totalMs: timer.totalMs!, remainingMs: timer.remainingMs!, endsAt }
}

/** A stored session if it is well formed and under 12 hours old, else null. */
export function parseCookSession(raw: unknown, now: number): CookSession | null {
  const session = raw as Partial<CookSession> | null
  if (!session || typeof session !== 'object') return null
  if (typeof session.recipeId !== 'string' || !session.recipeId) return null
  if (!Number.isFinite(session.updatedAt)) return null
  const age = now - session.updatedAt!
  if (age > COOK_SESSION_MAX_AGE_MS) return null
  if (!Number.isFinite(session.servings) || session.servings! <= 0) return null
  if (!Number.isInteger(session.stepIndex) || session.stepIndex! < 0) return null

  const timers: CookTimerMap = {}
  for (const [stepId, rawTimer] of Object.entries(session.timers ?? {})) {
    const timer = parseTimer(rawTimer)
    if (timer) timers[stepId] = timer
  }
  return {
    recipeId: session.recipeId,
    recipeName: typeof session.recipeName === 'string' ? session.recipeName : '',
    servings: session.servings!,
    stepIndex: session.stepIndex!,
    timers,
    updatedAt: session.updatedAt!,
  }
}

/** The session to resume for this recipe, or null when it is for another recipe, expired or invalid. */
export function getResumableSession(session: CookSession | null, recipeId: string): CookSession | null {
  return session && session.recipeId === recipeId ? session : null
}

/**
 * Whether the cook screen should save at all. The full-screen cook mode is a
 * session from the moment it opens; the one embedded in a recipe page's Method
 * tab only counts once you have moved on or started a timer, so merely
 * looking at a recipe never shows "Resume cooking".
 */
export function shouldSaveSession(
  state: Pick<CookSession, 'stepIndex' | 'timers'>,
  isEmbedded: boolean
): boolean {
  if (!isEmbedded) return true
  return state.stepIndex > 0 || Object.keys(state.timers).length > 0
}

export function loadCookSession(now: number = Date.now()): CookSession | null {
  try {
    const stored = window.localStorage.getItem(COOK_SESSION_KEY)
    if (!stored) return null
    const session = parseCookSession(JSON.parse(stored), now)
    if (!session) window.localStorage.removeItem(COOK_SESSION_KEY) // expired or unreadable: tidy up
    return session
  } catch {
    return null
  }
}

export function saveCookSession(session: CookSession): void {
  try {
    window.localStorage.setItem(COOK_SESSION_KEY, JSON.stringify(session))
  } catch {
    // Storage blocked or full: cooking still works, it just won't survive a reload.
  }
}

export function clearCookSession(): void {
  try {
    window.localStorage.removeItem(COOK_SESSION_KEY)
  } catch {
    // nothing to clear
  }
}
