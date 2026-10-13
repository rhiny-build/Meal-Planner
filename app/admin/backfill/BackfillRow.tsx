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
  enrich: 'bg-primary-soft text-primary  ',
  quick: 'bg-primary-soft text-primary  ',
  duplicate: 'bg-accent-soft text-ink  ',
  leave: 'bg-sunken text-ink  ',
}

const APPLY_STYLE: Record<RowApplyState['status'], string> = {
  applied: 'text-primary ',
  'nothing-to-do': 'text-ink-soft ',
  skipped: 'text-ink ',
  failed: 'text-danger ',
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
      <span className={`inline-block rounded-card px-2 py-0.5 text-xs font-semibold ${ACTION_STYLE[entry.action]}`}>{entry.action}</span>
    </div>
    <div className="col-start-2 text-sm break-words md:col-start-auto">{entry.summary}</div>
    <div className="col-start-2 text-sm text-ink-soft break-words md:col-start-auto">
      {entry.reason}
      {applyState && <div className={`mt-1 font-medium ${APPLY_STYLE[applyState.status]}`}>{applyState.status}: {applyState.detail}</div>}
    </div>
    <div className="col-start-2 text-sm md:col-start-auto">
      {entry.runId && (
        <Link href={`/agent-runs/${entry.runId}`} className="text-primary underline">
          Agent run
        </Link>
      )}
    </div>
  </li>
)

export default BackfillRow
