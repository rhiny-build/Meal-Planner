'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { setWeekStartDay, setShowOldShoppingList } from '../preferenceActions'

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

interface PreferencesTabProps {
  weekStartDay: number
  showOldShoppingList: boolean
}

export default function PreferencesTab({ weekStartDay, showOldShoppingList }: PreferencesTabProps) {
  const [isPending, startTransition] = useTransition()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDay = parseInt(e.target.value, 10)
    startTransition(async () => {
      try {
        await setWeekStartDay(newDay)
        toast.success(`Week now starts on ${DAY_OPTIONS.find(d => d.value === newDay)?.label}`)
      } catch (error) {
        console.error('Error updating week start day:', error)
        toast.error('Failed to update setting')
      }
    })
  }

  const handleToggleOldList = (e: React.ChangeEvent<HTMLInputElement>) => {
    const show = e.target.checked
    startTransition(async () => {
      try {
        await setShowOldShoppingList(show)
        toast.success(show ? 'Old shopping list shown' : 'Old shopping list hidden')
      } catch (error) {
        console.error('Error updating old shopping list setting:', error)
        toast.error('Failed to update setting')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink mb-4">
          Week Settings
        </h2>

        <div className="flex items-center gap-4">
          <label
            htmlFor="weekStartDay"
            className="text-sm font-medium text-ink"
          >
            Week starts on
          </label>
          <select
            id="weekStartDay"
            value={weekStartDay}
            onChange={handleChange}
            disabled={isPending}
            className="rounded-card border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 min-h-11"
          >
            {DAY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isPending && (
            <span className="text-sm text-ink-soft">Saving...</span>
          )}
        </div>

        <p className="mt-2 text-sm text-ink-soft">
          Controls which day the meal plan and shopping list weeks begin on.
          Existing weeks will keep their original start day.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-ink mb-4">
          Shopping
        </h2>
        <label className="flex items-center gap-3 min-h-11 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={showOldShoppingList}
            onChange={handleToggleOldList}
            disabled={isPending}
            className="h-5 w-5"
          />
          Show old shopping list
        </label>
        <p className="mt-2 text-sm text-ink-soft">
          Off: the Shopping tab shows only Next week. On: the older Meals, Staples, Restock and List tabs come back,
          with the Master Lists and Categories settings.
        </p>
      </div>
    </div>
  )
}
