/**
 * Admin: timings. How long pages and requests take, over the last 7 days:
 * per page the median and the slowest 10%, from the server's own measurements
 * and from the browser. Linked from Settings. No login: like the rest of the app.
 */

import { prisma } from '@/lib/prisma'
import { deleteOldTimings } from '@/lib/timing/saveTiming'
import { summariseTimings } from '@/lib/timing/summary'
import TimingTable from './TimingTable'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Timings' }

const WINDOW_DAYS = 7
const MAX_ROWS = 50_000

export default async function AdminTimingsPage() {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const [rows] = await Promise.all([
    prisma.requestTiming.findMany({
      where: { createdAt: { gte: since } },
      select: { source: true, kind: true, route: true, totalMs: true, dbMs: true, queryCount: true, coldStart: true, ttfbMs: true },
      take: MAX_ROWS,
      orderBy: { createdAt: 'desc' },
    }),
    deleteOldTimings().catch(() => undefined), // tidy-up: rows over 30 days old
  ])
  const summaries = summariseTimings(rows)
  const server = summaries.filter((summary) => summary.source === 'server')
  const browser = summaries.filter((summary) => summary.source === 'browser')

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Timings</h1>
        <p className="text-sm text-ink-soft">
          Last {WINDOW_DAYS} days, {rows.length} measurements. &ldquo;Slowest 10%&rdquo; means nine in ten were faster than this.
        </p>
      </header>
      <TimingTable
        title="In the browser"
        note="What you feel: tap (or opening the app) until the page is usable. Opening the app also shows time to first byte."
        summaries={browser}
        isBrowser
      />
      <TimingTable
        title="On the server"
        note="Time in our code, and how much of it was waiting for the database. Cold starts are the first request after a function woke up."
        summaries={server}
      />
    </div>
  )
}
