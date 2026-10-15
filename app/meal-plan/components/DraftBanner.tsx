'use client'

/** "Drafted from your notes / Accept all" (Week mockup). Shown while a draft week waits to be accepted. */

interface DraftBannerProps {
  summary: string | null
  isBusy: boolean
  onAccept: () => void
  onDiscard: () => void
}

export default function DraftBanner({ summary, isBusy, onAccept, onDiscard }: DraftBannerProps) {
  return (
    <div className="bg-accent-soft rounded-2xl px-4 py-3.5 mb-3 flex gap-3 items-center" data-testid="draft-banner">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[15px]">Drafted from your notes</p>
        {summary && <p className="text-[13px] text-ink-soft">{summary}</p>}
        <button type="button" onClick={onDiscard} className="min-h-11 text-[13px] font-semibold text-ink-soft underline">
          Throw away
        </button>
      </div>
      <button
        type="button"
        onClick={onAccept}
        disabled={isBusy}
        className="min-h-11 px-3.5 rounded-xl bg-ink text-white font-semibold text-sm disabled:opacity-50"
      >
        Accept all
      </button>
    </div>
  )
}
