'use client'

import Link from 'next/link'
import { isTickable, listRowsToApply } from './backfillSelection'
import BackfillProgress from './BackfillProgress'
import BackfillRow from './BackfillRow'
import { useBackfillRun } from './useBackfillRun'

const BUTTON = 'rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50'

const BackfillClient = () => {
  const run = useBackfillRun()
  const isBusy = run.phase !== 'idle'
  const rows = run.recipes.flatMap((recipe) => run.entries[recipe.id] ?? [])
  const failedCount = Object.keys(run.failures).length
  const toApplyCount = listRowsToApply(rows, run.ticked, run.applied).length
  const isReportStarted = rows.length > 0 || failedCount > 0
  const isDryRunComplete = run.recipes.length > 0 && rows.length === run.recipes.length

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <Link href="/settings" className="text-sm text-blue-600 dark:text-blue-400 underline">← Settings</Link>
      <h1 className="text-3xl font-bold">Recipe backfill</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Step 1: run a dry run. It reads each recipe&apos;s source page and proposes changes; nothing is changed yet.
        Step 2: tick the rows you want and apply them. Merging duplicates deletes a recipe, so those start unticked.
        You can close this page part-way and carry on later.
      </p>

      <div className="flex flex-wrap gap-2">
        <button onClick={run.runDryRun} disabled={isBusy || isDryRunComplete} className={`${BUTTON} bg-blue-600 text-white`}>
          {isReportStarted ? 'Continue dry run' : 'Run dry run'}
        </button>
        <button onClick={run.runApply} disabled={isBusy || toApplyCount === 0} className={`${BUTTON} bg-green-600 text-white`}>
          Apply {toApplyCount} ticked
        </button>
        {isBusy && <button onClick={run.stop} className={`${BUTTON} bg-gray-200 dark:bg-gray-700`}>Stop after this one</button>}
        {isReportStarted && !isBusy && <button onClick={run.startOver} className={`${BUTTON} bg-gray-200 dark:bg-gray-700`}>Clear report</button>}
      </div>

      {run.fatalError && <p role="alert" className="text-red-700 dark:text-red-300">{run.fatalError}</p>}
      {(isBusy || run.progress.total > 0) && (
        <BackfillProgress label={run.phase === 'applying' ? 'Applying' : 'Checked'} done={run.progress.done} total={run.progress.total} totals={run.totals} />
      )}
      {failedCount > 0 && (
        <p role="alert" className="text-amber-700 dark:text-amber-300">
          {failedCount} recipe{failedCount === 1 ? '' : 's'} could not be checked (e.g. {Object.values(run.failures)[0]}). &quot;Continue dry run&quot; tries them again.
        </p>
      )}

      {rows.length > 0 && (
        <ul className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700" data-testid="backfill-report">
          <li aria-hidden className="hidden md:grid md:grid-cols-[2rem_12rem_7rem_1fr_1fr_5rem] gap-x-3 p-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            <span>Apply</span><span>Recipe</span><span>Action</span><span>What would change</span><span>Why</span><span>Run</span>
          </li>
          {rows.map((entry) => (
            <BackfillRow
              key={entry.recipeId}
              entry={entry}
              isTicked={run.ticked[entry.recipeId] === true && isTickable(entry)}
              applyState={run.applied[entry.recipeId]}
              isBusy={isBusy}
              onToggle={() => run.toggleTick(entry.recipeId)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

export default BackfillClient
