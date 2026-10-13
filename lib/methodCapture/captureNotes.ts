/**
 * Capture notes: the short, timestamped notes typed while cooking.
 *
 * Pure functions plus a tiny localStorage layer. Notes (and a reviewed-but-unsaved draft)
 * stay on the device until saved or discarded, so an accidental reload loses nothing.
 */

export type CaptureNote = {
  id: string
  /** Epoch milliseconds when the note was added */
  at: number
  text: string
}

export type CaptureStep = {
  text: string
  timerSeconds: number | null
}

export type CaptureDraft = {
  notes: CaptureNote[]
  /** Set once Claude has structured the notes and the person is reviewing them */
  steps: CaptureStep[] | null
}

export const MAX_NOTES = 60
export const MAX_NOTE_LENGTH = 500

export const getCaptureStorageKey = (recipeId: string) => `mealplanner.capture.${recipeId}`

const pad = (value: number) => String(value).padStart(2, '0')

/** "+0:00", "+10:23", "+1:02:05": time since the first note. */
export function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0 ? `+${hours}:${pad(minutes)}:${pad(seconds)}` : `+${minutes}:${pad(seconds)}`
}

/** Notes as numbered lines for the prompt: "1. [+0:00] browned the mince". */
export function formatNotesForPrompt(notes: CaptureNote[]): string {
  if (notes.length === 0) return ''
  const start = notes[0].at
  return notes.map((note, index) => `${index + 1}. [${formatElapsed(note.at - start)}] ${note.text}`).join('\n')
}

export function addCaptureNote(notes: CaptureNote[], text: string, at: number): CaptureNote[] {
  const trimmed = text.trim().slice(0, MAX_NOTE_LENGTH)
  if (!trimmed || notes.length >= MAX_NOTES) return notes
  return [...notes, { id: `n${at}-${notes.length}`, at, text: trimmed }]
}

export function removeCaptureNote(notes: CaptureNote[], id: string): CaptureNote[] {
  return notes.filter((note) => note.id !== id)
}

/** Validate notes arriving from the browser. Returns null when unusable. */
export function parseCaptureNotes(raw: unknown): { at: number; text: string }[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_NOTES) return null
  const notes: { at: number; text: string }[] = []
  for (const entry of raw) {
    const text = typeof entry?.text === 'string' ? entry.text.trim() : ''
    if (!text || text.length > MAX_NOTE_LENGTH || !Number.isFinite(entry?.at)) return null
    notes.push({ at: Number(entry.at), text })
  }
  return notes.sort((first, second) => first.at - second.at)
}

export function loadCaptureDraft(recipeId: string): CaptureDraft | null {
  try {
    const stored = window.localStorage.getItem(getCaptureStorageKey(recipeId))
    if (!stored) return null
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed?.notes)) return null
    const notes = parsed.notes.filter(
      (note: CaptureNote) => typeof note?.text === 'string' && Number.isFinite(note?.at)
    )
    const steps = Array.isArray(parsed.steps) ? parsed.steps : null
    return notes.length > 0 ? { notes, steps } : null
  } catch {
    return null
  }
}

export function saveCaptureDraft(recipeId: string, draft: CaptureDraft): void {
  try {
    window.localStorage.setItem(getCaptureStorageKey(recipeId), JSON.stringify(draft))
  } catch {
    // Storage blocked or full: capture still works for this visit, it just won't survive a reload.
  }
}

export function clearCaptureDraft(recipeId: string): void {
  try {
    window.localStorage.removeItem(getCaptureStorageKey(recipeId))
  } catch {
    // nothing to clear
  }
}
