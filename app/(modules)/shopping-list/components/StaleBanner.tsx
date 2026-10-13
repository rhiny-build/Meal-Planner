/**
 * Stale Banner — shown when meal plan changed after shopping list was generated.
 */

import Button from '@/components/Button'

interface StaleBannerProps {
  onRegenerate: () => void
  isPending: boolean
}

export default function StaleBanner({ onRegenerate, isPending }: StaleBannerProps) {
  return (
    <div className="mb-4 p-3 rounded-card bg-accent-soft border border-accent flex items-center justify-between gap-3">
      <p className="text-sm text-ink">
        Meal plan changed — list may be out of date
      </p>
      <Button size="sm" onClick={onRegenerate} disabled={isPending}>
        {isPending ? 'Regenerating...' : 'Regenerate'}
      </Button>
    </div>
  )
}
