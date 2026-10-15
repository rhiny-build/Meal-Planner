/**
 * One timing table for the admin page: a row per page or request, slowest first.
 */

import type { TimingSummary } from '@/lib/timing/summary'

interface TimingTableProps {
  title: string
  note: string
  summaries: TimingSummary[]
  isBrowser?: boolean
}

const ms = (value: number | null) => (value === null ? '–' : `${value} ms`)
const cell = 'px-2 py-1.5 text-right whitespace-nowrap'

export default function TimingTable({ title, note, summaries, isBrowser = false }: TimingTableProps) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <p className="text-sm text-ink-soft">{note}</p>
      {summaries.length === 0 ? (
        <p className="text-sm text-ink-soft bg-surface rounded-card p-4">Nothing measured yet. Use the app for a while and come back.</p>
      ) : (
        <div className="overflow-x-auto bg-surface rounded-card">
          <table className="w-full text-sm" data-testid={isBrowser ? 'browser-timings' : 'server-timings'}>
            <thead>
              <tr className="text-ink-soft text-xs">
                <th className="px-2 py-1.5 text-left font-semibold">Page</th>
                <th className={`${cell} font-semibold`}>Count</th>
                <th className={`${cell} font-semibold`}>Median</th>
                <th className={`${cell} font-semibold`}>Slowest 10%</th>
                {isBrowser ? (
                  <th className={`${cell} font-semibold`}>First byte</th>
                ) : (
                  <>
                    <th className={`${cell} font-semibold`}>Database</th>
                    <th className={`${cell} font-semibold`}>Queries</th>
                    <th className={`${cell} font-semibold`}>Cold starts</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => (
                <tr key={`${summary.kind}-${summary.route}`} className="border-t border-line">
                  <td className="px-2 py-1.5 text-left font-medium">
                    {summary.route}
                    {isBrowser && (
                      <span className="block text-xs font-normal text-ink-soft">
                        {summary.kind === 'load' ? 'opening the app' : 'tapping to this page'}
                      </span>
                    )}
                  </td>
                  <td className={cell}>{summary.count}</td>
                  <td className={cell}>{ms(summary.medianMs)}</td>
                  <td className={cell}>{ms(summary.slowestTenthMs)}</td>
                  {isBrowser ? (
                    <td className={cell}>{ms(summary.medianTtfbMs)}</td>
                  ) : (
                    <>
                      <td className={cell}>{ms(summary.medianDbMs)}</td>
                      <td className={cell}>{summary.medianQueries ?? '–'}</td>
                      <td className={cell}>{summary.coldStarts}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
