import Link from 'next/link'
import type { ReportEntry } from '@/lib/agents/recipeBackfill/types'
import { isTickable, type RowApplyState } from './backfillSelection'

interface BackfillRowProps {
  entry: ReportEntry
  isTicked: boolean
  applyState?: RowApplyState
  isBusy: boolean
  onToggle: () => void
}

const ACTION_STYLE: Record<ReportEntry['action'], string> = {
  enrich: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  quick: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  duplicate: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  leave: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
}

const APPLY_STYLE: Record<RowApplyState['status'], string> = {
  applied: 'text-green-700 dark:text-green-300',
  'nothing-to-do': 'text-gray-600 dark:text-gray-400',
  skipped: 'text-amber-700 dark:text-amber-300',
  failed: 'text-red-700 dark:text-red-300',
}

const BackfillRow = ({ entry, isTicked, applyState, isBusy, onToggle }: BackfillRowProps) => (
  <li
    data-testid="backfill-row"
    data-action={entry.action}
    className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 p-3 md:grid-cols-[2rem_12rem_7rem_1fr_1fr_5rem] md:items-start"
  >
    <div className="row-span-2 md:row-span-1">
      {isTickable(entry) ? (
        <input
          type="checkbox"
          aria-label={`Apply ${entry.name}`}
          checked={isTicked}
          disabled={isBusy}
          onChange={onToggle}
          className="h-5 w-5 mt-0.5"
        />
      ) : (
        <span className="block h-5 w-5" aria-hidden />
      )}
    </div>
    <div className="font-medium break-words">{entry.name}</div>
    <div className="col-start-2 md:col-start-auto">
      <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${ACTION_STYLE[entry.action]}`}>{entry.action}</span>
    </div>
    <div className="col-start-2 text-sm break-words md:col-start-auto">{entry.summary}</div>
    <div className="col-start-2 text-sm text-gray-600 dark:text-gray-400 break-words md:col-start-auto">
      {entry.reason}
      {applyState && <div className={`mt-1 font-medium ${APPLY_STYLE[applyState.status]}`}>{applyState.status}: {applyState.detail}</div>}
    </div>
    <div className="col-start-2 text-sm md:col-start-auto">
      {entry.runId && (
        <Link href={`/agent-runs/${entry.runId}`} className="text-blue-600 dark:text-blue-400 underline">
          Agent run
        </Link>
      )}
    </div>
  </li>
)

export default BackfillRow
