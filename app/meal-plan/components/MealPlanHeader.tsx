/**
 * MealPlanHeader Component
 *
 * Week navigation and action buttons for the meal plan page
 */

import Button from '@/components/Button'
import { formatDate } from '@/lib/dateUtils'

interface MealPlanHeaderProps {
  startDate: Date
  selectedCount: number
  isGenerating: boolean
  isSaving: boolean
  onPreviousWeek: () => void
  onNextWeek: () => void
  onGenerate: () => void
  onSave: () => void
  onClear: () => void
}

export default function MealPlanHeader({
  startDate,
  selectedCount,
  isGenerating,
  isSaving,
  onPreviousWeek,
  onNextWeek,
  onGenerate,
  onSave,
  onClear,
}: MealPlanHeaderProps) {
  return (
    <>
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <Button variant="secondary" onClick={onPreviousWeek}>
          ← Previous Week
        </Button>
        <h2 className="text-xl font-semibold">
          Week of {formatDate(startDate)}
        </h2>
        <Button variant="secondary" onClick={onNextWeek}>
          Next Week →
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate with AI'}
        </Button>
        <Button onClick={onSave} disabled={isSaving} variant="secondary">
          {isSaving ? 'Saving...' : 'Save Meal Plan'}
        </Button>
        <Button onClick={onClear} variant="secondary">
          Clear All
        </Button>
      </div>

      {/* Meal Count */}
      <div className="mb-4 text-lg">
        <span className="font-medium">Selected meals:</span> {selectedCount} / 14
      </div>
    </>

    //TODO: Add AI instruction field with a default of generate plan for this week. At the moment, it will be heardcoded.
  )
}
