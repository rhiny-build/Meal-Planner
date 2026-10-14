'use client'

/**
 * "Next week" view: meals first, then the usual weekly items, then "Do you need these?".
 * Desktop shows the three sections together; on a phone they are three tabs.
 * The list itself is computed on the server on every visit; only ticks are remembered.
 */

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Button from '@/components/Button'
import { copyText, tickedCount, type ListLine, type NextWeekList } from '@/lib/nextWeek/buildList'
import type { NextWeekData } from '@/lib/nextWeek/loadNextWeek'
import { MIN_ORDERS } from '@/lib/nextWeek/predict'
import { setNextWeekTick } from '../../nextWeekActions'
import EditLineSheet from './EditLineSheet'
import LineRow from './LineRow'

type Section = 'meals' | 'usual' | 'maybe'
const SECTION_TABS: { key: Section; label: string }[] = [
  { key: 'meals', label: 'Meals' },
  { key: 'usual', label: 'Usual' },
  { key: 'maybe', label: 'Need these?' },
]

const withTicks = (list: NextWeekList, local: Record<string, boolean>): NextWeekList => {
  const apply = (line: ListLine): ListLine => (line.greyed ? line : { ...line, ticked: local[line.key] ?? line.ticked })
  return {
    meals: list.meals.map(m => ({ ...m, lines: m.lines.map(apply) })),
    usual: list.usual.map(g => ({ ...g, lines: g.lines.map(apply) })),
    maybe: list.maybe.map(apply),
  }
}

const formatOrderDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

export default function NextWeekTab({ data }: { data: NextWeekData }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [local, setLocal] = useState<Record<string, boolean>>({})
  const [section, setSection] = useState<Section>('meals')
  const [editing, setEditing] = useState<ListLine | null>(null)

  if (data.orderCount < MIN_ORDERS) {
    return (
      <div className="bg-surface rounded-card p-4 flex flex-col gap-2">
        <p className="font-display text-lg font-bold">No order history yet</p>
        <p className="text-ink-soft">Upload your Sainsbury&apos;s receipts and your next order will be predicted here.</p>
        <Link href="/admin/receipts" className="font-semibold text-primary min-h-11 flex items-center">Upload receipts</Link>
      </div>
    )
  }

  const list = withTicks(data.list, local)
  const count = tickedCount(list)

  const toggle = (key: string, ticked: boolean) => {
    setLocal(prev => ({ ...prev, [key]: ticked }))
    startTransition(() => {
      setNextWeekTick(data.orderDate, key, ticked).catch(() => toast.error('Could not save that tick'))
    })
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyText(list))
      toast.success(`Copied ${count} items`)
    } catch {
      toast.error('Could not copy')
    }
  }

  const show = (s: Section) => (section === s ? 'block' : 'hidden md:block')
  const row = (line: ListLine) => <LineRow key={line.key} line={line} onToggle={toggle} onEdit={setEditing} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">For delivery {formatOrderDate(data.orderDate)}</p>
          <h2 className="font-display text-2xl font-bold">Next week&apos;s list</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold" data-testid="ticked-count">{count} items ticked</span>
          <Button onClick={copy} disabled={count === 0}>Copy for Sainsbury&apos;s</Button>
        </div>
      </div>

      {data.unclassified > 0 && (
        <p className="text-sm text-ink-soft">
          {data.unclassified} products are still being sorted into items. <Link href="/admin/receipts" className="text-primary font-semibold">Finish on the admin page</Link>
        </p>
      )}

      <div className="md:hidden flex gap-1.5 bg-sunken p-1 rounded-card" role="tablist">
        {SECTION_TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={section === key}
            onClick={() => setSection(key)}
            className={`flex-1 min-h-11 rounded-[11px] text-sm font-semibold ${section === key ? 'bg-surface text-ink' : 'text-ink-soft'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className={`${show('meals')} flex flex-col gap-3`} aria-label="For this week's meals">
        <div className="flex items-baseline gap-3">
          <h3 className="font-display text-xl font-bold">For this week&apos;s meals</h3>
          <Link href="/meal-plan" className="text-sm font-semibold text-primary">Change meals</Link>
        </div>
        {list.meals.length === 0 && <p className="text-ink-soft">No meals planned for next week yet.</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.meals.map(meal => (
            <div key={meal.day} className="bg-surface rounded-[18px] border-2 border-primary px-4 pt-3 pb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">{meal.day}</p>
              <p className="font-display text-lg font-bold pb-1">{meal.name}</p>
              {meal.lines.map(row)}
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col md:flex-row gap-5 md:items-start">
        <section className={`${show('usual')} md:flex-[2] min-w-0 flex flex-col gap-3`} aria-label="Your usual weekly items">
          <h3 className="font-display text-xl font-bold">Your usual weekly items</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {list.usual.map(group => (
              <div key={group.aisle} className="bg-surface rounded-card px-3.5 pt-2 pb-1.5">
                <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">{group.aisle}</p>
                {group.lines.map(row)}
              </div>
            ))}
          </div>
        </section>

        <section className={`${show('maybe')} md:flex-1 min-w-0 flex flex-col gap-3`} aria-label="Do you need these?">
          <h3 className="font-display text-xl font-bold">Do you need these?</h3>
          <div className="bg-surface rounded-card px-3.5 py-1.5">
            {list.maybe.length === 0 ? <p className="py-3 text-ink-soft">Nothing to check this week.</p> : list.maybe.map(row)}
          </div>
        </section>
      </div>

      {editing && (
        <EditLineSheet
          line={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
