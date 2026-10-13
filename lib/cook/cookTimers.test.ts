import { describe, it, expect } from 'vitest'
import {
  startCookTimer,
  pauseCookTimer,
  resetCookTimer,
  tickCookTimers,
  getRemainingMs,
  formatClock,
  type CookTimerMap,
} from './cookTimers'

describe('cook timers', () => {
  describe('startCookTimer', () => {
    it('should start a running timer ending after the duration', () => {
      const timers = startCookTimer({}, 'a', 60, 1000)
      expect(timers.a).toEqual({ status: 'running', totalMs: 60000, remainingMs: 60000, endsAt: 61000 })
    })

    it('should leave an already running timer untouched', () => {
      const running = startCookTimer({}, 'a', 60, 1000)
      expect(startCookTimer(running, 'a', 60, 5000)).toBe(running)
    })

    it('should run several timers at once', () => {
      let timers: CookTimerMap = {}
      timers = startCookTimer(timers, 'a', 60, 0)
      timers = startCookTimer(timers, 'b', 300, 10_000)
      expect(timers.a.status).toBe('running')
      expect(timers.b.status).toBe('running')
      expect(timers.b.endsAt).toBe(310_000)
    })

    it('should resume a paused timer from the time left', () => {
      let timers = startCookTimer({}, 'a', 60, 0)
      timers = pauseCookTimer(timers, 'a', 20_000)
      timers = startCookTimer(timers, 'a', 60, 100_000)
      expect(timers.a.endsAt).toBe(140_000)
    })

    it('should restart a finished timer from the full duration', () => {
      let timers = startCookTimer({}, 'a', 10, 0)
      timers = tickCookTimers(timers, 10_000).timers
      timers = startCookTimer(timers, 'a', 10, 20_000)
      expect(timers.a).toMatchObject({ status: 'running', endsAt: 30_000 })
    })

    it('should mark a zero-length timer done straight away', () => {
      expect(startCookTimer({}, 'a', 0, 0).a.status).toBe('done')
    })
  })

  describe('pauseCookTimer', () => {
    it('should keep the time left when paused', () => {
      const timers = pauseCookTimer(startCookTimer({}, 'a', 60, 0), 'a', 25_000)
      expect(timers.a).toMatchObject({ status: 'paused', remainingMs: 35_000, endsAt: null })
    })

    it('should ignore timers that are not running', () => {
      const empty: CookTimerMap = {}
      expect(pauseCookTimer(empty, 'a', 0)).toBe(empty)
    })
  })

  describe('resetCookTimer', () => {
    it('should remove only that timer', () => {
      let timers = startCookTimer({}, 'a', 60, 0)
      timers = startCookTimer(timers, 'b', 60, 0)
      const reset = resetCookTimer(timers, 'a')
      expect(Object.keys(reset)).toEqual(['b'])
    })

    it('should return the same map when there is nothing to reset', () => {
      const empty: CookTimerMap = {}
      expect(resetCookTimer(empty, 'a')).toBe(empty)
    })
  })

  describe('tickCookTimers', () => {
    it('should report timers that have finished and leave others running', () => {
      let timers = startCookTimer({}, 'a', 10, 0)
      timers = startCookTimer(timers, 'b', 100, 0)
      const result = tickCookTimers(timers, 10_000)
      expect(result.finishedStepIds).toEqual(['a'])
      expect(result.timers.a.status).toBe('done')
      expect(result.timers.b.status).toBe('running')
    })

    it('should report a finished timer only once', () => {
      const timers = startCookTimer({}, 'a', 10, 0)
      const first = tickCookTimers(timers, 11_000)
      const second = tickCookTimers(first.timers, 12_000)
      expect(first.finishedStepIds).toEqual(['a'])
      expect(second.finishedStepIds).toEqual([])
    })

    it('should not touch paused timers', () => {
      const timers = pauseCookTimer(startCookTimer({}, 'a', 10, 0), 'a', 1000)
      expect(tickCookTimers(timers, 999_999).finishedStepIds).toEqual([])
    })

    it('should still finish a timer when the tab was asleep past its end', () => {
      const timers = startCookTimer({}, 'a', 60, 0)
      expect(tickCookTimers(timers, 600_000).finishedStepIds).toEqual(['a'])
    })
  })

  describe('getRemainingMs', () => {
    it('should give the full duration before a timer is started', () => {
      expect(getRemainingMs(undefined, 90, 0)).toBe(90_000)
    })

    it('should count down while running and never go negative', () => {
      const timers = startCookTimer({}, 'a', 60, 0)
      expect(getRemainingMs(timers.a, 60, 15_000)).toBe(45_000)
      expect(getRemainingMs(timers.a, 60, 99_000)).toBe(0)
    })

    it('should hold the time left while paused', () => {
      const timers = pauseCookTimer(startCookTimer({}, 'a', 60, 0), 'a', 15_000)
      expect(getRemainingMs(timers.a, 60, 500_000)).toBe(45_000)
    })
  })

  describe('formatClock', () => {
    it('should format minutes and seconds', () => {
      expect(formatClock(300_000)).toBe('5:00')
      expect(formatClock(7_000)).toBe('0:07')
    })

    it('should round partial seconds up', () => {
      expect(formatClock(1_200)).toBe('0:02')
      expect(formatClock(0)).toBe('0:00')
    })

    it('should include hours when needed', () => {
      expect(formatClock(3_900_000)).toBe('1:05:00')
    })
  })
})
