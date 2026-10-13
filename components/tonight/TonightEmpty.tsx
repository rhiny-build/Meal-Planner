/**
 * TonightEmpty
 *
 * Shown when nothing is planned for today: one clear action to plan it.
 */

import Link from 'next/link'

interface TonightEmptyProps {
  planHref: string
}

export default function TonightEmpty({ planHref }: TonightEmptyProps) {
  return (
    <section
      aria-label="Nothing planned tonight"
      className="bg-surface rounded-panel p-6 flex flex-col gap-3"
      data-testid="tonight-empty"
    >
      <h2 className="font-display text-2xl font-bold text-ink">Nothing planned for tonight</h2>
      <p className="text-ink-soft">Pick something now, or leave it open if you are eating out.</p>
      <Link
        href={planHref}
        className="min-h-12 inline-flex items-center justify-center rounded-card bg-primary text-white font-semibold text-[17px]"
      >
        Plan tonight
      </Link>
    </section>
  )
}
