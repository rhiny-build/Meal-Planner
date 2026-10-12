/**
 * Small display helpers for the /agent-runs pages. Generic: nothing here knows about a
 * particular agent, so every future agent shows up correctly.
 */

export function formatDuration(startedAt: Date, finishedAt: Date | null): string {
  if (!finishedAt) return 'running'
  const seconds = (finishedAt.getTime() - startedAt.getTime()) / 1000
  return seconds < 60 ? `${seconds.toFixed(1)} s` : `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`
}

export function formatTokens(input: number, output: number): string {
  return `${input.toLocaleString('en-GB')} in / ${output.toLocaleString('en-GB')} out`
}

export function formatWhen(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  })
}

export function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

export interface ModelBlockSummary {
  kind: 'text' | 'thinking' | 'tool_use' | 'other'
  label: string
  detail?: string
}

/** One line per block of a recorded model response: what Claude said or asked for. */
export function summariseModelContent(payload: unknown): ModelBlockSummary[] {
  const content = (payload as { content?: unknown })?.content
  if (!Array.isArray(content)) return []
  return content.map((block: any): ModelBlockSummary => {
    if (block?.type === 'text') return { kind: 'text', label: 'Said', detail: String(block.text ?? '') }
    if (block?.type === 'thinking') return { kind: 'thinking', label: 'Thought', detail: String(block.thinking ?? '') }
    if (block?.type === 'tool_use') {
      return { kind: 'tool_use', label: `Asked to run ${block.name}`, detail: pretty(block.input) }
    }
    return { kind: 'other', label: String(block?.type ?? 'block') }
  })
}
