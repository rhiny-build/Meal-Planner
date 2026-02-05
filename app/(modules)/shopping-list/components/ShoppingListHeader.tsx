/**
 * Shopping List Header Component
 *
 * Shows week navigation and action buttons
 */

'use client'

import Button from '@/components/Button'

interface ShoppingListHeaderProps {
  startDate: Date
  onPreviousWeek: () => void
  onNextWeek: () => void
  onGenerate?: () => void
  onExport?: () => void
  isGenerating?: boolean
  hasItems?: boolean
}

export default function ShoppingListHeader({
  startDate,
  onPreviousWeek,
  onNextWeek,
  onGenerate,
  onExport,
  isGenerating,
  hasItems,
}: ShoppingListHeaderProps) {
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b dark:border-gray-700">
      {/* Week Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="secondary" size="sm" onClick={onPreviousWeek}>
          &larr; Prev
        </Button>
        <span className="text-lg font-medium">
          {formatDate(startDate)} - {formatDate(endDate)}
        </span>
        <Button variant="secondary" size="sm" onClick={onNextWeek}>
          Next &rarr;
        </Button>
      </div>

      {/* Action Buttons */}
      {onGenerate && (
        <div className="flex gap-2">
          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            size="sm"
          >
            {isGenerating ? 'Generating...' : 'Regenerate List'}
          </Button>
          {hasItems && onExport && (
            <Button variant="secondary" size="sm" onClick={onExport}>
              Copy to Clipboard
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
