/**
 * WeekDayRow
 *
 * One day in the week list: short day name and date, the dinner (main and
 * sides), the day's note, and a swap button that opens the change sheet.
 */

import { getDinner, type PlanDay } from '@/lib/tonight'
import SwapIcon from '@/components/SwapIcon'

interface WeekDayRowProps {
  day: string
  date: Date
  isToday: boolean
  plan: PlanDay
  lunchName: string | null
  note: string
  onSwap: () => void
}

export default function WeekDayRow({ day, date, isToday, plan, lunchName, note, onSwap }: WeekDayRowProps) {
  const dinner = getDinner(plan)
  const sides = dinner ? dinner.sides.map((side) => side.name).join(', ') : ''
  const detail = [sides, lunchName && `Lunch: ${lunchName}`, note && `Note: ${note}`].filter(Boolean)

  return (
    <li
      className={`bg-surface rounded-2xl px-3.5 py-3 flex items-center gap-3 ${isToday ? 'ring-2 ring-primary' : ''}`}
      data-testid="week-day-row"
      data-day={day}
    >
      <div className="w-11 flex flex-col items-center">
        <span className="text-xs text-ink-soft">{day.slice(0, 3)}</span>
        <span className="font-display text-xl font-bold text-ink">{date.getDate()}</span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className={`text-[15px] font-semibold truncate ${dinner ? 'text-ink' : 'text-ink-soft'}`}>
          {dinner ? dinner.main.name : 'Nothing planned'}
        </span>
        {detail.length > 0 && <span className="text-[13px] text-ink-soft truncate">{detail.join(' · ')}</span>}
      </div>
      <button
        type="button"
        onClick={onSwap}
        aria-label={`Change ${day}`}
        className="w-11 h-11 flex-none rounded-card bg-ground text-ink flex items-center justify-center"
      >
        <SwapIcon />
      </button>
    </li>
  )
}
