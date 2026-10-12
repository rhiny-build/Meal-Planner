import { describe, it, expect } from 'vitest'
import { formatDuration, formatTokens, summariseModelContent } from './runView'

describe('runView', () => {
  it('formats durations', () => {
    const start = new Date('2026-10-12T10:00:00Z')
    expect(formatDuration(start, null)).toBe('running')
    expect(formatDuration(start, new Date('2026-10-12T10:00:04.200Z'))).toBe('4.2 s')
    expect(formatDuration(start, new Date('2026-10-12T10:01:30Z'))).toBe('1 min 30 s')
  })

  it('formats tokens', () => {
    expect(formatTokens(1234, 56)).toBe('1,234 in / 56 out')
  })

  it('summarises a recorded model response', () => {
    const blocks = summariseModelContent({
      content: [
        { type: 'text', text: 'Let me fetch it' },
        { type: 'tool_use', id: 't', name: 'fetch_page', input: { url: 'u' } },
        { type: 'mystery' },
      ],
    })
    expect(blocks.map((b) => [b.kind, b.label])).toEqual([
      ['text', 'Said'],
      ['tool_use', 'Asked to run fetch_page'],
      ['other', 'mystery'],
    ])
    expect(summariseModelContent(null)).toEqual([])
  })
})
