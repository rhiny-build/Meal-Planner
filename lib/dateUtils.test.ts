/**
 * Unit Tests for Date Utilities
 *
 * TESTING PATTERN: Arrange -> Act -> Assert
 */

import { describe, it, expect } from 'vitest'
import { getWeekStart, getMonday, formatDate, isWeekStartDay, isMonday } from '@/lib/dateUtils'

describe('dateUtils', () => {
  describe('getWeekStart', () => {
    it('should return the same date when input is already the start day (Monday)', () => {
      const monday = new Date('2025-01-06') // Monday
      const result = getWeekStart(monday, 1)
      expect(result.getFullYear()).toBe(2025)
      expect(result.getMonth()).toBe(0)
      expect(result.getDate()).toBe(6)
    })

    it('should find Monday when input is Wednesday', () => {
      const wednesday = new Date('2025-01-08')
      const result = getWeekStart(wednesday, 1)
      expect(result.getDate()).toBe(6)
      expect(result.getMonth()).toBe(0)
    })

    it('should find Monday when input is Sunday', () => {
      const sunday = new Date('2025-01-12')
      const result = getWeekStart(sunday, 1)
      expect(result.getDate()).toBe(6)
    })

    it('should set time to midnight', () => {
      const dateWithTime = new Date('2025-01-08T15:30:45')
      const result = getWeekStart(dateWithTime, 1)
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
      expect(result.getMilliseconds()).toBe(0)
    })

    it('should handle month boundaries correctly', () => {
      // Feb 1, 2025 is Saturday -> Monday is Jan 27
      const febFirst = new Date('2025-02-01')
      const result = getWeekStart(febFirst, 1)
      expect(result.getMonth()).toBe(0) // January
      expect(result.getDate()).toBe(27)
    })

    it('should find Sunday when startDay is Sunday (0)', () => {
      // Jan 8, 2025 is Wednesday -> Sunday is Jan 5
      const wednesday = new Date('2025-01-08')
      const result = getWeekStart(wednesday, 0)
      expect(result.getDate()).toBe(5)
      expect(result.getDay()).toBe(0)
    })

    it('should find Saturday when startDay is Saturday (6)', () => {
      // Jan 8, 2025 is Wednesday -> Saturday is Jan 4
      const wednesday = new Date('2025-01-08')
      const result = getWeekStart(wednesday, 6)
      expect(result.getDate()).toBe(4)
      expect(result.getDay()).toBe(6)
    })

    it('should return the same date when input is already the start day (Sunday)', () => {
      const sunday = new Date('2025-01-05') // Sunday
      const result = getWeekStart(sunday, 0)
      expect(result.getDate()).toBe(5)
      expect(result.getDay()).toBe(0)
    })

    it('should default to Monday when startDay is omitted', () => {
      const wednesday = new Date('2025-01-08')
      const result = getWeekStart(wednesday)
      expect(result.getDate()).toBe(6)
      expect(result.getDay()).toBe(1)
    })
  })

  describe('getMonday (deprecated alias)', () => {
    it('should still work as a backwards-compatible alias', () => {
      const wednesday = new Date('2025-01-08')
      const result = getMonday(wednesday)
      expect(result.getDate()).toBe(6)
      expect(result.getDay()).toBe(1)
    })
  })

  describe('formatDate', () => {
    it('should format date as "Mon Day" (e.g., "Jan 15")', () => {
      const date = new Date('2025-01-15')
      expect(formatDate(date)).toBe('Jan 15')
    })

    it('should handle single digit days', () => {
      const date = new Date('2025-03-05')
      expect(formatDate(date)).toBe('Mar 5')
    })

    it('should handle December correctly', () => {
      const date = new Date('2025-12-25')
      expect(formatDate(date)).toBe('Dec 25')
    })
  })

  describe('isWeekStartDay', () => {
    it('should return true when date matches the start day', () => {
      const monday = new Date('2025-01-06')
      expect(isWeekStartDay(monday, 1)).toBe(true)
    })

    it('should return false when date does not match', () => {
      const tuesday = new Date('2025-01-07')
      expect(isWeekStartDay(tuesday, 1)).toBe(false)
    })

    it('should work with Sunday as start day', () => {
      const sunday = new Date('2025-01-05')
      expect(isWeekStartDay(sunday, 0)).toBe(true)
      expect(isWeekStartDay(sunday, 1)).toBe(false)
    })
  })

  describe('isMonday (deprecated alias)', () => {
    it('should return true for Monday', () => {
      const monday = new Date('2025-01-06')
      expect(isMonday(monday)).toBe(true)
    })

    it('should return false for other days', () => {
      const tuesday = new Date('2025-01-07')
      expect(isMonday(tuesday)).toBe(false)
    })
  })
})
