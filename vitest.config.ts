/**
 * Vitest Configuration
 *
 * This config file sets up Vitest for testing a Next.js application.
 * Key features:
 * - React plugin for JSX/component testing
 * - jsdom environment for DOM APIs (needed for React Testing Library)
 * - Path aliases matching tsconfig.json
 * - Separate setup file for global test utilities
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  test: {
    // Use jsdom to simulate browser environment
    // This is required for React Testing Library to work
    environment: 'jsdom',

    // Global setup file - runs before all tests
    // Use this for things like extending matchers (e.g., jest-dom)
    setupFiles: ['./vitest.setup.ts'],

    // Include test files matching these patterns
    include: ['**/*.test.ts', '**/*.test.tsx'],

    // Exclude node_modules and build directories
    exclude: ['node_modules', '.next', 'dist'],

    // Enable global test functions (describe, it, expect) without importing
    globals: true,

    // Coverage configuration (optional, run with --coverage flag)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules', '.next', '**/*.test.*'],
    },
  },

  resolve: {
    // Match the path aliases from tsconfig.json
    // This allows imports like '@/lib/dateUtils' in tests
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
