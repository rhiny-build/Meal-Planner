/**
 * Cook mode timers (pure state functions)
 *
 * Each step with a timer has at most one timer, keyed by step id. A timer
 * stores the wall-clock time it ends at (not a counter), so it stays correct
 * when the browser throttles a backgrounded tab, and it lives above the step
 * view so changing step never stops it.
 *
 * All functions take `now` (ms) and return a new map; nothing mutates.
 */

export type CookTimerStatus = 'running' | 'paused' | 'done'

export interface CookTimer {
  status: CookTimerStatus
  totalMs: number
  /** Time left when paused; the full duration before the first start. */
  remainingMs: number
  /** Wall-clock time the timer ends, only while running. */
  endsAt: number | null
}

export type CookTimerMap = Record<string, CookTimer>

/** Start, resume (if paused) or restart (if done) the timer for a step. A running timer is left alone. */
export function startCookTimer(
  timers: CookTimerMap,
  stepId: string,
  durationSeconds: number,
  now: number
): CookTimerMap {
  const existing = timers[stepId]
  if (existing?.status === 'running') return timers
  const totalMs = Math.max(0, Math.round(durationSeconds * 1000))
  const remainingMs = existing?.status === 'paused' ? existing.remainingMs : totalMs
  if (remainingMs <= 0) {
    return { ...timers, [stepId]: { status: 'done', totalMs, remainingMs: 0, endsAt: null } }
  }
  return {
    ...timers,
    [stepId]: { status: 'running', totalMs, remainingMs, endsAt: now + remainingMs },
  }
}

/** Pause a running timer, keeping the time left. Other states are unchanged. */
export function pauseCookTimer(timers: CookTimerMap, stepId: string, now: number): CookTimerMap {
  const timer = timers[stepId]
  if (!timer || timer.status !== 'running' || timer.endsAt === null) return timers
  const remainingMs = Math.max(0, timer.endsAt - now)
  return { ...timers, [stepId]: { ...timer, status: 'paused', remainingMs, endsAt: null } }
}

/** Reset a timer back to not started (also dismisses a finished one). */
export function resetCookTimer(timers: CookTimerMap, stepId: string): CookTimerMap {
  if (!(stepId in timers)) return timers
  return Object.fromEntries(Object.entries(timers).filter(([id]) => id !== stepId))
}

/** Milliseconds left on a timer at `now`; the full duration if it was never started. */
export function getRemainingMs(
  timer: CookTimer | undefined,
  durationSeconds: number,
  now: number
): number {
  if (!timer) return Math.max(0, durationSeconds * 1000)
  if (timer.status === 'running' && timer.endsAt !== null) return Math.max(0, timer.endsAt - now)
  return timer.remainingMs
}

/** Move every running timer whose time has passed to done, and report which just finished. */
export function tickCookTimers(
  timers: CookTimerMap,
  now: number
): { timers: CookTimerMap; finishedStepIds: string[] } {
  const finishedStepIds: string[] = []
  const next: CookTimerMap = {}
  for (const [stepId, timer] of Object.entries(timers)) {
    if (timer.status === 'running' && timer.endsAt !== null && timer.endsAt <= now) {
      finishedStepIds.push(stepId)
      next[stepId] = { ...timer, status: 'done', remainingMs: 0, endsAt: null }
    } else {
      next[stepId] = timer
    }
  }
  if (finishedStepIds.length === 0) return { timers, finishedStepIds }
  return { timers: next, finishedStepIds }
}

/** "5:00", "0:07", "1:05:00". Rounds up so a timer never shows 0:00 while still running. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const ss = String(seconds).padStart(2, '0')
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`
  return `${minutes}:${ss}`
}
