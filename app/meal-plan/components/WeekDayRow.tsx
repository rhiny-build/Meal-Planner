/**
 * WeekDayRow
 *
 * One day in the week list: short day name and date, the dinner (protein as
 * the main, carb and vegetable as sides under it), lunch as a small second
 * line, the day's note, and a swap button that opens the change sheet.
 * Tapping the dinner opens the day's ingredients underneath.
 */

'use client'

import { useState } from 'react'
import { getDinner } from '@/lib/tonight'
import SwapIcon from '@/components/SwapIcon'
import WeekDayDetails, { type DaySlots } from './WeekDayDetails'

interface WeekDayRowProps {
  day: string
  date: Date
  isToday: boolean
  slots: DaySlots
  note: string
  /** Why the draft chose this day's meals (only while a draft is pending) */
  reason?: string
  onSwap: () => void
}

export default function WeekDayRow({ day, date, isToday, slots, note, reason, onSwap }: WeekDayRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dinner = getDinner({
    dayOfWeek: day,
    proteinRecipe: slots.protein,
    carbRecipe: slots.carb,
    vegetableRecipe: slots.vegetable,
  })
  const sides = dinner ? dinner.sides.map((side) => side.name).join(', ') : ''

  return (
    <li
      className={`bg-surface rounded-2xl px-3.5 py-3 ${isToday ? 'ring-2 ring-primary' : ''}`}
      data-testid="week-day-row"
      data-day={day}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsOpen((wasOpen) => !wasOpen)}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Hide' : 'Show'} ${day} details`}
          className="flex-1 min-w-0 min-h-11 flex items-center gap-3 text-left"
        >
          <span className="w-11 flex-none flex flex-col items-center">
            <span className="text-xs text-ink-soft">{day.slice(0, 3)}</span>
            <span className="font-display text-xl font-bold text-ink">{date.getDate()}</span>
          </span>
          <span className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className={`text-[15px] font-semibold truncate ${dinner ? 'text-ink' : 'text-ink-soft'}`}>
              {dinner ? dinner.main.name : 'Nothing planned'}
            </span>
            {reason && <span className="text-[13px] text-primary font-medium" data-testid="day-reason">{reason}</span>}
            {sides && <span className="text-[13px] text-ink-soft truncate">{sides}</span>}
            {slots.lunch && (
              <span className="text-xs text-ink-soft truncate" data-testid="week-day-lunch">
                Lunch: {slots.lunch.name}
              </span>
            )}
            {note && <span className="text-xs text-ink-soft truncate">Note: {note}</span>}
          </span>
        </button>
        <button
          type="button"
          onClick={onSwap}
          aria-label={`Change ${day}`}
          className="w-11 h-11 flex-none rounded-card bg-ground text-ink flex items-center justify-center"
        >
          <SwapIcon />
        </button>
      </div>
      {isOpen && <WeekDayDetails day={day} slots={slots} />}
    </li>
  )
}
