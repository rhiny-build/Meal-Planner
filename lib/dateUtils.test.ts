/**
 * Unit Tests for Date Utilities
 *
 * This file demonstrates testing pure functions - functions that:
 * - Always return the same output for the same input
 * - Have no side effects (don't modify external state)
 * - Don't depend on external services
 *
 * Pure functions are the easiest to test because you don't need mocks!
 *
 * TESTING PATTERN: Arrange → Act → Assert
 * 1. Arrange: Set up the test data
 * 2. Act: Call the function being tested
 * 3. Assert: Verify the result matches expectations
 */

import { describe, it, expect } from 'vitest'
import { getMonday, formatDate, isMonday } from '@/lib/dateUtils'

/**
 * describe() groups related tests together
 * Use nested describe blocks to organize by function or scenario
 */
describe('dateUtils', () => {
  /**
   * Tests for getMonday()
   *
   * This function finds the Monday of the week for any given date.
   * We need to test various scenarios:
   * - What if the input is already a Monday?
   * - What if it's a Wednesday (middle of week)?
   * - What if it's a Sunday (end of week)?
   */
  describe('getMonday', () => {
    it('should return the same date when input is already Monday', () => {
      // Arrange: January 6, 2025 is a Monday
      const monday = new Date('2025-01-06')

      // Act: Get the Monday for this date
      const result = getMonday(monday)

      // Assert: Should return the same date (normalized to midnight)
      expect(result.getFullYear()).toBe(2025)
      expect(result.getMonth()).toBe(0) // January is month 0
      expect(result.getDate()).toBe(6)
    })

    it('should find Monday when input is Wednesday', () => {
      // Arrange: January 8, 2025 is a Wednesday
      const wednesday = new Date('2025-01-08')

      // Act
      const result = getMonday(wednesday)

      // Assert: Should return January 6 (the Monday of that week)
      expect(result.getDate()).toBe(6)
      expect(result.getMonth()).toBe(0)
    })

    it('should find Monday when input is Sunday', () => {
      // Arrange: January 12, 2025 is a Sunday
      // This tests the edge case where Sunday belongs to the PREVIOUS week's Monday
      const sunday = new Date('2025-01-12')

      // Act
      const result = getMonday(sunday)

      // Assert: Should return January 6, not January 13
      expect(result.getDate()).toBe(6)
    })

    it('should set time to midnight (00:00:00)', () => {
      // Arrange: A date with a specific time
      const dateWithTime = new Date('2025-01-08T15:30:45')

      // Act
      const result = getMonday(dateWithTime)

      // Assert: Time should be normalized to midnight
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
      expect(result.getMilliseconds()).toBe(0)
    })

    it('should handle month boundaries correctly', () => {
      // Arrange: February 1, 2025 is a Saturday
      // The Monday of this week is January 27, 2025 (crosses month boundary)
      const febFirst = new Date('2025-02-01')

      // Act
      const result = getMonday(febFirst)

      // Assert: Should return January 27
      expect(result.getMonth()).toBe(0) // January
      expect(result.getDate()).toBe(27)
    })
  })

  /**
   * Tests for formatDate()
   *
   * This formats dates for user display (e.g., "Jan 15")
   * We test different months and edge cases
   */
  describe('formatDate', () => {
    it('should format date as "Mon Day" (e.g., "Jan 15")', () => {
      // Arrange
      const date = new Date('2025-01-15')

      // Act
      const result = formatDate(date)

      // Assert: Should be "Jan 15"
      expect(result).toBe('Jan 15')
    })

    it('should handle single digit days', () => {
      // Arrange
      const date = new Date('2025-03-05')

      // Act
      const result = formatDate(date)

      // Assert: Day should not have leading zero
      expect(result).toBe('Mar 5')
    })

    it('should handle December correctly', () => {
      // Arrange
      const date = new Date('2025-12-25')

      // Act
      const result = formatDate(date)

      // Assert
      expect(result).toBe('Dec 25')
    })
  })

  /**
   * Tests for isMonday()
   *
   * Simple boolean check - tests should cover both true and false cases
   */
  describe('isMonday', () => {
    it('should return true for Monday', () => {
      // January 6, 2025 is a Monday
      const monday = new Date('2025-01-06')
      expect(isMonday(monday)).toBe(true)
    })

    it('should return false for other days', () => {
      // Test a few different days to be thorough
      const tuesday = new Date('2025-01-07')
      const wednesday = new Date('2025-01-08')
      const sunday = new Date('2025-01-12')

      expect(isMonday(tuesday)).toBe(false)
      expect(isMonday(wednesday)).toBe(false)
      expect(isMonday(sunday)).toBe(false)
    })
  })
})
