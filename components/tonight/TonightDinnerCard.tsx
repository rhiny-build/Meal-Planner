/**
 * TonightDinnerCard
 *
 * The green card at the top of Tonight: the main dish, its sides and time,
 * a "Start cooking" button (cook mode for the main recipe) and a swap button.
 */

import Link from 'next/link'
import { formatCookTime, type Dinner } from '@/lib/tonight'
import SwapIcon from '@/components/SwapIcon'

interface TonightDinnerCardProps {
  dinner: Dinner
  /** Where the swap button goes: the week list with today's change sheet open. */
  swapHref: string
}

const chipClass = 'text-[13px] bg-white/15 px-2.5 py-1 rounded-full'

export default function TonightDinnerCard({ dinner, swapHref }: TonightDinnerCardProps) {
  const time = formatCookTime(dinner.main.totalTimeMinutes)

  return (
    <section
      aria-label="Tonight's dinner"
      className="bg-primary text-white rounded-panel p-5 flex flex-col gap-3.5"
      data-testid="tonight-dinner"
    >
      <span className="text-[13px] uppercase tracking-[0.08em] text-primary-soft/80">Dinner</span>
      <h2 className="font-display text-[28px] font-bold leading-tight" data-testid="tonight-main">
        {dinner.main.name}
      </h2>
      {(dinner.sides.length > 0 || time) && (
        <ul className="flex flex-wrap gap-2" data-testid="tonight-sides">
          {dinner.sides.map((side) => (
            <li key={side.id} className={chipClass}>
              + {side.name}
            </li>
          ))}
          {time && <li className={chipClass}>{time}</li>}
        </ul>
      )}
      <div className="flex gap-2.5 mt-1">
        <Link
          href={`/recipes/${dinner.main.id}/cook`}
          className="flex-1 min-h-12 inline-flex items-center justify-center rounded-card bg-accent text-ink font-semibold text-[17px]"
        >
          Start cooking
        </Link>
        <Link
          href={swapHref}
          aria-label="Swap tonight's meal"
          className="w-[52px] min-h-12 inline-flex items-center justify-center rounded-card bg-white/15 text-white"
        >
          <SwapIcon size={22} />
        </Link>
      </div>
    </section>
  )
}
