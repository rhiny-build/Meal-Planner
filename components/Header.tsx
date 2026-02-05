'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTheme } from './ThemeProvider'

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '/recipes', label: 'Recipes' },
    { href: '/meal-plan', label: 'Meal Plan' },
    { href: '/shopping-list', label: 'Shopping List' },
  ]

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

          {/* Desktop navigation - hidden on mobile */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-blue-100 dark:text-neutral-300 hover:text-white dark:hover:text-fuchsia-400 font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-blue-700 dark:bg-neutral-700 text-white hover:bg-blue-800 dark:hover:bg-neutral-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>

          {/* Mobile: theme toggle + hamburger button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-blue-700 dark:bg-neutral-700 text-white hover:bg-blue-800 dark:hover:bg-neutral-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-blue-700 dark:bg-neutral-700 text-white hover:bg-blue-800 dark:hover:bg-neutral-600 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-blue-500 dark:border-neutral-600">
            <div className="flex flex-col space-y-3">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-blue-100 dark:text-neutral-300 hover:text-white dark:hover:text-fuchsia-400 font-medium transition-colors py-2"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
