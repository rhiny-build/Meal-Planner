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
    <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3">
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Meal plan changed — list may be out of date
      </p>
      <Button size="sm" onClick={onRegenerate} disabled={isPending}>
        {isPending ? 'Regenerating...' : 'Regenerate'}
      </Button>
    </div>
  )
}
