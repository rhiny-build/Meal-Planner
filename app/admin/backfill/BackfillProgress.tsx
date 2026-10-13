import { formatCostUsd } from './backfillSelection'
import type { RunTotals } from './useBackfillRun'

interface BackfillProgressProps {
  label: string
  done: number
  total: number
  totals: RunTotals
}

const BackfillProgress = ({ label, done, total, totals }: BackfillProgressProps) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4" aria-live="polite">
    <div className="flex flex-wrap justify-between gap-2 text-sm mb-2">
      <span data-testid="backfill-progress-label">{label}: {done} of {total}</span>
      <span data-testid="backfill-cost">
        {(totals.inputTokens + totals.outputTokens).toLocaleString('en-GB')} tokens · about {formatCostUsd(totals.costUsd)}
      </span>
    </div>
    <div className="h-2 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
      <div className="h-full bg-blue-500 transition-all" style={{ width: total ? `${(done / total) * 100}%` : '0%' }} />
    </div>
  </div>
)

export default BackfillProgress
