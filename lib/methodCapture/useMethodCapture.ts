'use client'

/**
 * useMethodCapture: the state machine behind "Tell me as you go".
 *
 *   idle -> capturing -> structuring -> review -> (save) done / (discard) idle
 *
 * Notes and the reviewed draft are mirrored to localStorage until saved or discarded.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addCaptureNote,
  clearCaptureDraft,
  loadCaptureDraft,
  removeCaptureNote,
  saveCaptureDraft,
  type CaptureNote,
  type CaptureStep,
} from './captureNotes'

export type CapturePhase = 'idle' | 'capturing' | 'structuring' | 'review' | 'saving'

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error || 'Something went wrong. Your notes are kept.')
  return data
}

export function useMethodCapture(recipeId: string) {
  const router = useRouter()
  const [phase, setPhase] = useState<CapturePhase>('idle')
  const [notes, setNotes] = useState<CaptureNote[]>([])
  const [steps, setSteps] = useState<CaptureStep[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isRestored, setIsRestored] = useState(false)

  useEffect(() => {
    const stored = loadCaptureDraft(recipeId)
    if (stored) {
      setNotes(stored.notes)
      if (stored.steps) setSteps(stored.steps)
      setPhase(stored.steps ? 'review' : 'capturing')
    }
    setIsRestored(true)
  }, [recipeId])

  useEffect(() => {
    if (!isRestored || notes.length === 0) return
    saveCaptureDraft(recipeId, { notes, steps: phase === 'review' ? steps : null })
  }, [isRestored, recipeId, notes, steps, phase])

  const addNote = useCallback((text: string) => setNotes((current) => addCaptureNote(current, text, Date.now())), [])
  const removeNote = useCallback((id: string) => setNotes((current) => removeCaptureNote(current, id)), [])

  const discard = useCallback(() => {
    clearCaptureDraft(recipeId)
    setNotes([])
    setSteps([])
    setError(null)
    setPhase('idle')
  }, [recipeId])

  const finish = useCallback(async () => {
    setError(null)
    setPhase('structuring')
    try {
      const data = await postJson(`/api/recipes/${recipeId}/capture`, {
        notes: notes.map(({ at, text }) => ({ at, text })),
      })
      setSteps(data.steps)
      setPhase('review')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Your notes are kept.')
      setPhase('capturing')
    }
  }, [recipeId, notes])

  const save = useCallback(async () => {
    setError(null)
    setPhase('saving')
    try {
      await postJson(`/api/recipes/${recipeId}/method`, { steps })
      clearCaptureDraft(recipeId)
      router.refresh() // the cook page re-reads the steps and shows the stepped view
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save. Your steps are kept.')
      setPhase('review')
    }
  }, [recipeId, steps, router])

  return {
    phase,
    notes,
    steps,
    error,
    isRestored,
    setSteps,
    start: () => setPhase('capturing'),
    addNote,
    removeNote,
    finish,
    save,
    discard,
  }
}
