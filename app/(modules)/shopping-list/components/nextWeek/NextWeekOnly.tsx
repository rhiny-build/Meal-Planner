'use client'

/**
 * The Shopping page when the old shopping list is switched off in Settings:
 * just the Next week view, no tab bar.
 */

import PageHeader from '@/components/PageHeader'
import type { NextWeekData } from '@/lib/nextWeek/loadNextWeek'
import NextWeekTab from './NextWeekTab'

export default function NextWeekOnly({ data }: { data: NextWeekData }) {
  return (
    <div className="max-w-xl md:max-w-4xl mx-auto px-4">
      <PageHeader title="Shopping list" />
      <NextWeekTab data={data} />
    </div>
  )
}
