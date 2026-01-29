'use client'

import Link from 'next/link'
import { useTheme } from './ThemeProvider'

export default function Header() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="bg-blue-600 dark:bg-neutral-800 border-b border-blue-700 dark:border-neutral-700">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-bold text-white hover:text-blue-100 dark:hover:text-fuchsia-400 transition-colors"
          >
            Family Meal Planner
          </Link>
          <div className="flex items-center space-x-6">
            <Link
              href="/recipes"
              className="text-blue-100 dark:text-neutral-300 hover:text-white dark:hover:text-fuchsia-400 font-medium transition-colors"
            >
              Recipes
            </Link>
            <Link
              href="/meal-plan"
              className="text-blue-100 dark:text-neutral-300 hover:text-white dark:hover:text-fuchsia-400 font-medium transition-colors"
            >
              Meal Plan
            </Link>
            <Link
              href="/shopping-list"
              className="text-blue-100 dark:text-neutral-300 hover:text-white dark:hover:text-fuchsia-400 font-medium transition-colors"
            >
              Shopping List
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-blue-700 dark:bg-neutral-700 text-white hover:bg-blue-800 dark:hover:bg-neutral-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}
