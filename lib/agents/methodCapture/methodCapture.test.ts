/**
 * Method-capture tests. Claude is replayed: each fixture holds the real Haiku response recorded
 * from a run with the dev key (scripts/rehaul/sampleMethodCapture.ts). The real loop runs on top.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import case1 from './fixtures/1-clear-timings.json'
import case2 from './fixtures/2-vague-no-times.json'
import case4 from './fixtures/4-tempts-invention.json'
import case5 from './fixtures/5-no-cooking.json'

const mockAnthropic = vi.hoisted(() => ({ messages: { create: vi.fn() } }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = mockAnthropic.messages
  },
}))
const prismaMock = vi.hoisted(() => ({ recipe: { findUnique: vi.fn() } }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
const runLog = vi.hoisted(() => ({ trigger: undefined as unknown, agent: undefined as unknown, failed: undefined as unknown }))
vi.mock('../runLog', () => ({
  startRun: vi.fn(async (params: { agent: string; trigger: string }) => {
    runLog.agent = params.agent
    runLog.trigger = params.trigger
    return { id: 'run_1', step: async () => {}, finish: async () => {}, fail: async (e: string) => void (runLog.failed = e) }
  }),
}))

import { CaptureNotAllowedError, runMethodCapture } from './index'
import { buildCaptureSteps } from './tools'

type Fixture = {
  ingredients: { id: string; name: string }[]
  notes: { at: number; text: string }[]
  responses: unknown[]
}

function replay(fixture: Fixture, stepCount = 0) {
  prismaMock.recipe.findUnique.mockResolvedValue({
    id: 'r1',
    name: 'Beef Keema',
    structuredIngredients: fixture.ingredients.map((i, order) => ({ ...i, order, quantity: null, unit: null, amount: null })),
    _count: { steps: stepCount },
  })
  for (const response of fixture.responses) mockAnthropic.messages.create.mockResolvedValueOnce(response)
}
const notesOf = (fixture: Fixture) => fixture.notes.map(({ at, text }) => ({ at, text }))

beforeEach(() => vi.clearAllMocks())

describe('runMethodCapture (replayed Claude responses)', () => {
  it('should turn clear timed notes into steps with timers only where the notes support them', async () => {
    replay(case1 as Fixture)
    const result = await runMethodCapture('r1', notesOf(case1 as Fixture))
    expect(result.ok).toBe(true)
    expect(result.output!.steps.map((s) => s.timerSeconds)).toEqual([360, 360, 1200, null, null])
    expect(result.output!.steps[2].text).toContain(`{ing:${case1.ingredients[3].id}}`)
    expect(runLog.agent).toBe('method-capture')
    expect(runLog.trigger).toBe('manual')
  })

  it('should give no timers when the notes give no durations', async () => {
    replay(case2 as Fixture)
    const result = await runMethodCapture('r1', notesOf(case2 as Fixture))
    expect(result.ok).toBe(true)
    expect(result.output!.steps.every((s) => s.timerSeconds === null)).toBe(true)
  })

  it('should not turn vague amounts into quantities', async () => {
    replay(case4 as Fixture)
    const result = await runMethodCapture('r1', notesOf(case4 as Fixture))
    const text = result.output!.steps.map((s) => s.text).join(' ')
    expect(text).not.toMatch(/\d+\s?(g|tsp|tbsp|ml)\b/)
  })

  it('should give up, with a reason, when the notes hold no cooking', async () => {
    replay(case5 as Fixture)
    const result = await runMethodCapture('r1', notesOf(case5 as Fixture))
    expect(result.ok).toBe(false)
    expect(result.gaveUpReason).toMatch(/no cooking steps/)
  })

  it('should send the notes with their elapsed times and the ingredient ids', async () => {
    replay(case1 as Fixture)
    await runMethodCapture('r1', notesOf(case1 as Fixture))
    const request = mockAnthropic.messages.create.mock.calls[0][0]
    const message = request.messages[0].content[0].text ?? request.messages[0].content
    expect(JSON.stringify(message)).toContain('2. [+6:00]')
    expect(JSON.stringify(message)).toContain(`{ing:${case1.ingredients[0].id}}`)
    expect(request.system[0].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('should refuse a recipe that already has steps, before calling Claude', async () => {
    replay(case1 as Fixture, 3)
    await expect(runMethodCapture('r1', notesOf(case1 as Fixture))).rejects.toThrow(CaptureNotAllowedError)
    expect(mockAnthropic.messages.create).not.toHaveBeenCalled()
  })
})

describe('buildCaptureSteps', () => {
  const submitted = (over = {}) => ({ steps: [{ text: 'Brown {ing:a}.', from_notes: [1], ...over }] })

  it('should reject unknown ingredient tokens and bad note numbers', () => {
    expect(() => buildCaptureSteps(submitted({ text: 'Brown {ing:zzz}.' }), ['a'], 2)).toThrow(/bad ingredient token/)
    expect(() => buildCaptureSteps(submitted({ from_notes: [3] }), ['a'], 2)).toThrow(/from_notes/)
    expect(() => buildCaptureSteps(submitted({ from_notes: [] }), ['a'], 2)).toThrow(/from_notes/)
    expect(() => buildCaptureSteps({ steps: [] }, ['a'], 2)).toThrow(/non-empty/)
  })

  it('should keep a timer only when it comes with evidence', () => {
    const withEvidence = buildCaptureSteps(submitted({ timer_seconds: 600, timer_evidence: 'simmer 10 min' }), ['a'], 2)
    const without = buildCaptureSteps(submitted({ timer_seconds: 600 }), ['a'], 2)
    const silly = buildCaptureSteps(submitted({ timer_seconds: 999999, timer_evidence: 'x' }), ['a'], 2)
    expect(withEvidence[0].timerSeconds).toBe(600)
    expect(without[0].timerSeconds).toBeNull()
    expect(silly[0].timerSeconds).toBeNull()
  })
})
