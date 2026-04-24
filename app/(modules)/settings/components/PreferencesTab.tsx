'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { setWeekStartDay } from '../preferenceActions'

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
}

export default function PreferencesTab({ weekStartDay }: PreferencesTabProps) {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Week Settings
        </h2>

        <div className="flex items-center gap-4">
          <label
            htmlFor="weekStartDay"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Week starts on
          </label>
          <select
            id="weekStartDay"
            value={weekStartDay}
            onChange={handleChange}
            disabled={isPending}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {DAY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isPending && (
            <span className="text-sm text-gray-500 dark:text-gray-400">Saving...</span>
          )}
        </div>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Controls which day the meal plan and shopping list weeks begin on.
          Existing weeks will keep their original start day.
        </p>
      </div>
    </div>
  )
}
