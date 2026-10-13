/**
 * RestOfWeekList
 *
 * Compact list of the days still to come this week: short day name, the main
 * dish and its sides. Tapping a row opens that day in the week list.
 */

import Link from 'next/link'
import { getDinner, type PlanDay } from '@/lib/tonight'

interface RestOfWeekListProps {
  days: PlanDay[]
}

export default function RestOfWeekList({ days }: RestOfWeekListProps) {
  return (
    <section aria-labelledby="rest-of-week-heading" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between px-1 pt-3">
        <h2 id="rest-of-week-heading" className="font-display text-xl font-bold text-ink">
          Rest of the week
        </h2>
        <Link href="/meal-plan" className="min-h-11 inline-flex items-center text-sm font-semibold text-primary">
          See week
        </Link>
      </div>
      {days.length === 0 ? (
        <p className="bg-surface rounded-card px-4 py-3 text-ink-soft">That was the last day of this week.</p>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="rest-of-week">
          {days.map((day) => {
            const dinner = getDinner(day)
            return (
              <li key={day.dayOfWeek}>
                <Link
                  href={`/meal-plan?day=${day.dayOfWeek}`}
                  className="min-h-14 flex items-center gap-3.5 bg-surface rounded-card px-3.5 py-3"
                >
                  <span className="w-10 text-[13px] font-semibold text-ink-soft">{day.dayOfWeek.slice(0, 3)}</span>
                  <span className="flex flex-col flex-1 min-w-0">
                    <span className="font-semibold text-[15px] text-ink truncate">
                      {dinner ? dinner.main.name : 'Nothing planned'}
                    </span>
                    {dinner && dinner.sides.length > 0 && (
                      <span className="text-[13px] text-ink-soft truncate">
                        {dinner.sides.map((side) => side.name).join(', ')}
                      </span>
                    )}
                  </span>
                  {dinner?.main.kind === 'quick' && <span className="text-xs text-ink-soft">Quick</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
