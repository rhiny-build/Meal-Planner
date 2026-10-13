/**
 * Agent run detail (server component)
 *
 * Replays one run: the input, then every step in order (what the model said and asked
 * for, each tool call and its result), then the outcome. Payloads expand on tap.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import {
  formatDuration,
  formatTokens,
  formatWhen,
  pretty,
  summariseModelContent,
} from '@/lib/agents/runView'
import StatusBadge from '../StatusBadge'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Agent run' }

function Json({ value, summary, open = false }: { value: unknown; summary: string; open?: boolean }) {
  return (
    <details open={open} className="mt-1">
      <summary className="cursor-pointer text-sm text-primary">{summary}</summary>
      <pre className="mt-1 p-2 text-xs bg-sunken rounded-card overflow-x-auto max-h-96 whitespace-pre-wrap break-words">
        {pretty(value)}
      </pre>
    </details>
  )
}

const KIND_LABEL: Record<string, string> = {
  model: 'Model turn',
  tool_call: 'Tool call',
  tool_result: 'Tool result',
  note: 'Note from the loop',
}

export default async function AgentRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await prisma.agentRun.findUnique({
    where: { id },
    include: { steps: { orderBy: { order: 'asc' } } },
  })
  if (!run) notFound()

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link href="/agent-runs" className="text-sm text-primary underline">
        All runs
      </Link>

      <div className="flex flex-wrap items-center gap-3 mt-2 mb-1">
        <h1 className="text-2xl font-bold">{run.agent}</h1>
        <StatusBadge status={run.status} />
      </div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft mb-4">
        <div>{formatWhen(run.startedAt)}</div>
        <div>trigger: {run.trigger}</div>
        <div>{formatDuration(run.startedAt, run.finishedAt)}</div>
        <div>{formatTokens(run.inputTokens, run.outputTokens)} tokens</div>
        {(run.cacheReadTokens > 0 || run.cacheCreationTokens > 0) && (
          <div>
            cache: {run.cacheReadTokens} read / {run.cacheCreationTokens} written
          </div>
        )}
      </dl>

      <section className="bg-white rounded-card shadow p-4 mb-4">
        <h2 className="font-semibold">Asked to</h2>
        <Json value={run.input} summary="Input" open />
      </section>

      <h2 className="font-semibold mb-2">Steps ({run.steps.length})</h2>
      <ol className="space-y-2 mb-4">
        {run.steps.map((step) => {
          const isError = step.kind === 'tool_result' && (step.payload as any)?.isError === true
          return (
            <li
              key={step.id}
              className={`rounded-card shadow p-3 border-l-4 bg-white  ${
                isError
                  ? 'border-danger'
                  : step.kind === 'model'
                    ? 'border-primary '
                    : step.kind === 'note'
                      ? 'border-accent'
                      : 'border-line '
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">
                  {step.order + 1}. {KIND_LABEL[step.kind] ?? step.kind}
                  {step.toolName ? `: ${step.toolName}` : ''}
                  {isError ? ' (error)' : ''}
                </span>
                {step.inputTokens !== null && (
                  <span className="text-xs text-ink-soft">
                    {formatTokens(step.inputTokens, step.outputTokens ?? 0)} tokens
                  </span>
                )}
              </div>

              {step.kind === 'model' && (
                <>
                  <ul className="mt-1 space-y-1 text-sm">
                    {summariseModelContent(step.payload).map((block, i) => (
                      <li key={i}>
                        <span className="text-ink-soft">{block.label}</span>
                        {block.kind === 'text' || block.kind === 'thinking' ? (
                          <p className="whitespace-pre-wrap break-words">{block.detail}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-ink-soft mt-1">
                    stopped because: {String((step.payload as any)?.stopReason ?? 'unknown')}
                  </p>
                  <Json value={step.payload} summary="Raw response" />
                </>
              )}

              {step.kind === 'tool_call' && <Json value={(step.payload as any)?.input ?? step.payload} summary="Input" />}
              {step.kind === 'tool_result' && (
                <Json value={(step.payload as any)?.output ?? step.payload} summary="Output" />
              )}
              {step.kind === 'note' && (
                <p className="text-sm mt-1 whitespace-pre-wrap">{(step.payload as any)?.text ?? pretty(step.payload)}</p>
              )}
              {!['model', 'tool_call', 'tool_result', 'note'].includes(step.kind) && (
                <Json value={step.payload} summary="Payload" />
              )}
            </li>
          )
        })}
      </ol>

      <section className="bg-white rounded-card shadow p-4">
        <h2 className="font-semibold">Outcome</h2>
        {run.status === 'failed' && (
          <p className="text-danger text-sm mt-1">{run.error ?? 'Failed'}</p>
        )}
        {run.output !== null && <Json value={run.output} summary="Final output" open />}
        {run.status === 'running' && <p className="text-sm text-ink-soft mt-1">Still running, or it stopped without finishing.</p>}
      </section>
    </div>
  )
}
