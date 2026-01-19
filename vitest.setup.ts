/**
 * Vitest Setup File
 *
 * This file runs before all tests. Use it to:
 * - Add global test utilities
 * - Extend expect with custom matchers
 * - Set up mock implementations
 * - Configure test environment
 */

import '@testing-library/jest-dom/vitest'

/**
 * @testing-library/jest-dom adds custom matchers like:
 * - toBeInTheDocument()
 * - toHaveTextContent()
 * - toBeVisible()
 * - toBeDisabled()
 * - toHaveClass()
 * etc.
 *
 * These make assertions more readable and provide better error messages.
 *
 * Example usage in tests:
 *   expect(element).toBeInTheDocument()
 *   expect(button).toBeDisabled()
 *   expect(heading).toHaveTextContent('Hello')
 */
