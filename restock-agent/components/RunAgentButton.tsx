'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function RunAgentButton() {
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  async function handleRun() {
    setRunning(true)
    setLog([])
    setSummary(null)
    setError(null)

    try {
      const res = await fetch('/api/agent/run', { method: 'POST' })
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line) continue
          if (line.startsWith('log:')) {
            setLog((prev) => {
              const next = [...prev, line.slice(4)]
              setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 0)
              return next
            })
          } else if (line.startsWith('done:')) {
            const [, processed, logged, skipped] = line.split(':')
            setSummary(`Processed ${processed} | Logged ${logged} | Skipped ${skipped}`)
          } else if (line.startsWith('error:')) {
            setError(line.slice(6))
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setRunning(false)
      router.refresh()
    }
  }

  return (
    <div>
      <button
        onClick={handleRun}
        disabled={running}
        className="text-sm px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-wait"
      >
        {running ? 'Running…' : 'Run Agent'}
      </button>

      {(log.length > 0 || summary || error) && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div
            ref={logRef}
            className="font-mono text-xs text-gray-600 bg-gray-50 px-4 py-3 max-h-48 overflow-y-auto space-y-0.5"
          >
            {log.map((l, i) => (
              <p key={i} className={l.startsWith('[pending]') ? 'text-indigo-700' : l.startsWith('[staple]') ? 'text-gray-400' : ''}>{l}</p>
            ))}
          </div>
          {summary && (
            <p className="px-4 py-2 text-sm font-medium text-gray-700 border-t border-gray-100">
              {summary}
            </p>
          )}
          {error && (
            <p className="px-4 py-2 text-sm text-red-600 border-t border-gray-100">
              Error: {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
