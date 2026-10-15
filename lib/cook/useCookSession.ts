/**
 * useCookSession
 *
 * Connects the cook screen to the saved cook session (see cookSession.ts):
 * once, after the page has loaded in the browser, it puts the saved step,
 * servings and timers back; from then on it saves every change. `endSession`
 * clears it when you leave cook mode on purpose.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CookTimerMap } from './cookTimers'
import {
  clearCookSession,
  getResumableSession,
  loadCookSession,
  saveCookSession,
  shouldSaveSession,
} from './cookSession'

interface UseCookSessionInput {
  recipeId: string
  recipeName: string
  stepIndex: number
  servings: number
  timers: CookTimerMap
  isEmbedded: boolean
  onRestore: (saved: { stepIndex: number; servings: number; timers: CookTimerMap }) => void
}

export function useCookSession({
  recipeId,
  recipeName,
  stepIndex,
  servings,
  timers,
  isEmbedded,
  onRestore,
}: UseCookSessionInput) {
  const [hasRestored, setHasRestored] = useState(false)
  const hasEnded = useRef(false)
  const onRestoreRef = useRef(onRestore)
  onRestoreRef.current = onRestore

  // Storage only exists in the browser, so restoring waits until after the first render
  useEffect(() => {
    const saved = getResumableSession(loadCookSession(), recipeId)
    if (saved) onRestoreRef.current({ stepIndex: saved.stepIndex, servings: saved.servings, timers: saved.timers })
    setHasRestored(true)
  }, [recipeId])

  useEffect(() => {
    if (!hasRestored || hasEnded.current) return
    if (!shouldSaveSession({ stepIndex, timers }, isEmbedded)) return
    saveCookSession({ recipeId, recipeName, servings, stepIndex, timers, updatedAt: Date.now() })
  }, [hasRestored, recipeId, recipeName, servings, stepIndex, timers, isEmbedded])

  const endSession = useCallback(() => {
    hasEnded.current = true
    clearCookSession()
  }, [])

  return { endSession }
}
