/**
 * useCookTimers
 *
 * Owns every timer of the cook screen. It lives above the step view, so
 * moving between steps never stops a timer. Ticks 4x a second, and when a
 * timer finishes it fires the alert and remembers it in `finishedStepIds`
 * until dismissed.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  startCookTimer,
  pauseCookTimer,
  resetCookTimer,
  tickCookTimers,
  type CookTimerMap,
} from './cookTimers'
import { alertTimerFinished, unlockTimerAudio } from './timerAlert'

const TICK_MS = 250

export function useCookTimers() {
  const [timers, setTimers] = useState<CookTimerMap>({})
  const [now, setNow] = useState(() => Date.now())
  const [finishedStepIds, setFinishedStepIds] = useState<string[]>([])
  const timersRef = useRef(timers)
  timersRef.current = timers

  const hasRunning = Object.values(timers).some((timer) => timer.status === 'running')

  useEffect(() => {
    if (!hasRunning) return
    const interval = setInterval(() => {
      const tickTime = Date.now()
      setNow(tickTime)
      const result = tickCookTimers(timersRef.current, tickTime)
      if (result.finishedStepIds.length === 0) return
      // Update the ref now so the next tick cannot report the same finish twice
      timersRef.current = result.timers
      setTimers(result.timers)
      setFinishedStepIds((previous) => [...previous, ...result.finishedStepIds])
      alertTimerFinished()
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [hasRunning])

  const startTimer = useCallback((stepId: string, durationSeconds: number) => {
    unlockTimerAudio()
    const startTime = Date.now()
    setNow(startTime)
    setFinishedStepIds((previous) => previous.filter((id) => id !== stepId))
    setTimers((current) => startCookTimer(current, stepId, durationSeconds, startTime))
  }, [])

  const pauseTimer = useCallback((stepId: string) => {
    setTimers((current) => pauseCookTimer(current, stepId, Date.now()))
  }, [])

  const resetTimer = useCallback((stepId: string) => {
    setFinishedStepIds((previous) => previous.filter((id) => id !== stepId))
    setTimers((current) => resetCookTimer(current, stepId))
  }, [])

  /** Put back timers saved by an earlier visit (see cookSession.ts). Ones that ended meanwhile finish on the next tick. */
  const restoreTimers = useCallback((saved: CookTimerMap) => {
    setNow(Date.now())
    setTimers(saved)
  }, [])

  const dismissFinished = useCallback((stepId: string) => {
    setFinishedStepIds((previous) => previous.filter((id) => id !== stepId))
  }, [])

  return { timers, now, finishedStepIds, startTimer, pauseTimer, resetTimer, restoreTimers, dismissFinished }
}
