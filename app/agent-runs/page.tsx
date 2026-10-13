/**
 * Agent runs list (server component)
 *
 * Every agent run, newest first. Generic: works for any agent that records runs through
 * lib/agents/runLog.ts.
 */

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatDuration, formatTokens, formatWhen } from '@/lib/agents/runView'
import StatusBadge from './StatusBadge'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Agent runs' }

const LIMIT = 100

export default async function AgentRunsPage() {
  const runs = await prisma.agentRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: LIMIT,
    include: { _count: { select: { steps: true } } },
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link href="/settings" className="inline-flex items-center min-h-11 text-sm font-semibold text-primary">&larr; Settings</Link>
      <h1 className="text-3xl font-bold mb-1">Agent runs</h1>
      <p className="text-ink-soft mb-6">
        Everything the app&apos;s agents did: what they were asked, which tools they used, and how they finished.
      </p>

      {runs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-card shadow">
          <p className="text-ink-soft">No runs yet. Import a recipe to see one here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {runs.map((run) => (
            <li key={run.id}>
              <Link
                href={`/agent-runs/${run.id}`}
                className="block bg-white rounded-card shadow p-4 hover:ring-2 hover:ring-primary"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{run.agent}</span>
                  <StatusBadge status={run.status} />
                </div>
                <p className="text-sm text-ink-soft mt-1 break-words">
                  {summariseInput(run.input)}
                </p>
                <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
                  <div>{formatWhen(run.startedAt)}</div>
                  <div>trigger: {run.trigger}</div>
                  <div>{formatDuration(run.startedAt, run.finishedAt)}</div>
                  <div>{run._count.steps} steps</div>
                  <div>{formatTokens(run.inputTokens, run.outputTokens)} tokens</div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** A short line describing what the run was asked to do. */
function summariseInput(input: unknown): string {
  if (input && typeof input === 'object') {
    const values = Object.values(input as Record<string, unknown>)
    const first = values.find((v) => typeof v === 'string') as string | undefined
    if (first) return first.length > 140 ? `${first.slice(0, 140)}...` : first
  }
  return typeof input === 'string' ? input : JSON.stringify(input).slice(0, 140)
}
