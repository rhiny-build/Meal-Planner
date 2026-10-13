/**
 * CaptureNotesPanel: the notes list, a text box to add one, and Finish / Discard.
 * Dictation is the phone keyboard's own; nothing custom.
 */

'use client'

import { useState } from 'react'
import { formatElapsed, MAX_NOTE_LENGTH, type CaptureNote } from '@/lib/methodCapture/captureNotes'

interface CaptureNotesPanelProps {
  notes: CaptureNote[]
  error: string | null
  isBusy: boolean
  onAddNote: (text: string) => void
  onRemoveNote: (id: string) => void
  onFinish: () => void
  onDiscard: () => void
}

const buttonBase = 'min-h-12 rounded-card px-4 font-semibold disabled:opacity-40'

export default function CaptureNotesPanel({
  notes,
  error,
  isBusy,
  onAddNote,
  onRemoveNote,
  onFinish,
  onDiscard,
}: CaptureNotesPanelProps) {
  const [draftText, setDraftText] = useState('')
  const submit = () => {
    if (!draftText.trim()) return
    onAddNote(draftText)
    setDraftText('')
  }

  return (
    <div className="mt-8 border-t border-line pt-6" data-testid="capture-panel">
      <h2 className="text-2xl font-bold mb-1">Tell me as you go</h2>
      <p className="text-ink-soft mb-4">
        Add a short note as you cook ("browned the mince", "simmering now"). Tap Finish when you are done.
      </p>
      {notes.length > 0 && (
        <ol className="mb-4 space-y-2" data-testid="capture-notes">
          {notes.map((note) => (
            <li key={note.id} className="flex items-start gap-3 rounded-card bg-sunken px-3 py-2">
              <span className="flex-none font-mono text-sm text-ink-soft pt-0.5">
                {formatElapsed(note.at - notes[0].at)}
              </span>
              <span className="flex-1 text-lg">{note.text}</span>
              <button
                type="button"
                className="flex-none min-h-9 px-2 text-ink-soft"
                aria-label={`Delete note: ${note.text}`}
                onClick={() => onRemoveNote(note.id)}
              >
                &times;
              </button>
            </li>
          ))}
        </ol>
      )}
      <textarea
        value={draftText}
        onChange={(event) => setDraftText(event.target.value)}
        maxLength={MAX_NOTE_LENGTH}
        rows={2}
        placeholder="What are you doing now?"
        aria-label="New note"
        className="w-full rounded-card border border-line bg-white p-3 text-lg"
      />
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          className={`${buttonBase} bg-primary text-white`}
          disabled={!draftText.trim() || isBusy}
          onClick={submit}
        >
          Add note
        </button>
        <button
          type="button"
          className={`${buttonBase} bg-primary text-white`}
          disabled={notes.length === 0 || isBusy}
          onClick={onFinish}
        >
          {isBusy ? 'Writing up the steps...' : 'Finish and write up the steps'}
        </button>
        <button
          type="button"
          className={`${buttonBase} bg-sunken`}
          disabled={isBusy}
          onClick={onDiscard}
        >
          Discard notes
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-danger " data-testid="capture-error">
          {error}
        </p>
      )}
    </div>
  )
}
