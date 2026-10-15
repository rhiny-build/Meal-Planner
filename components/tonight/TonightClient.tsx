/**
 * TonightClient
 *
 * The home page: today's dinner with a Start cooking button and a swap button,
 * today's note, a Resume cooking card while a cook session is in progress, the rest of the week, and shortcuts to the shopping list and
 * the meal plan. With nothing planned it shows one action to plan tonight.
 */

'use client'

import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import { useTonight } from '@/lib/hooks/useTonight'
import { getWeekdayName } from '@/lib/tonight'
import TonightDinnerCard from './TonightDinnerCard'
import TonightEmpty from './TonightEmpty'
import RestOfWeekList from './RestOfWeekList'
import ResumeCookingCard from './ResumeCookingCard'

interface TonightClientProps {
  weekStartDay: number
}

const shortcutClass = 'min-h-16 bg-surface rounded-2xl p-3.5 flex flex-col gap-1 text-ink'

export default function TonightClient({ weekStartDay }: TonightClientProps) {
  const { isLoading, hasError, today, dinner, dayNote, restOfWeek } = useTonight(weekStartDay)

  const dateLabel = today?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const planHref = `/meal-plan?day=${today ? getWeekdayName(today) : ''}`

  return (
    <div className="max-w-xl mx-auto px-4 flex flex-col gap-3">
      <PageHeader
        title="Tonight"
        eyebrow={dateLabel}
        trailing={
          dayNote ? (
            <span className="text-[13px] text-ink-soft bg-sunken px-2.5 py-1.5 rounded-full max-w-[11rem] truncate" data-testid="tonight-note">
              Note: {dayNote}
            </span>
          ) : null
        }
      />

      <ResumeCookingCard />

      {isLoading ? (
        <div className="h-52 rounded-panel bg-sunken animate-pulse" aria-label="Loading tonight" />
      ) : hasError ? (
        <p className="bg-danger-soft text-danger rounded-card p-4" role="alert">
          Could not load tonight&apos;s plan. Check your connection and refresh.
        </p>
      ) : dinner ? (
        <TonightDinnerCard dinner={dinner} swapHref={planHref} />
      ) : (
        <TonightEmpty planHref={planHref} />
      )}

      {!isLoading && !hasError && <RestOfWeekList days={restOfWeek} />}

      <div className="grid grid-cols-2 gap-2.5 pt-2">
        <Link href="/shopping-list" className={shortcutClass}>
          <span className="font-semibold text-[15px]">Shopping list</span>
          <span className="text-[13px] text-ink-soft">What to buy</span>
        </Link>
        <Link href="/meal-plan" className={shortcutClass}>
          <span className="font-semibold text-[15px]">Meal plan</span>
          <span className="text-[13px] text-ink-soft">Plan the week</span>
        </Link>
      </div>
    </div>
  )
}
