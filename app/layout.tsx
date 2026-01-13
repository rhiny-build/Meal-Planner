/**
 * Root Layout Component
 *
 * This is the main layout wrapper for the entire app.
 * It sets up the HTML structure, includes global styles,
 * and provides a consistent navigation header.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Family Meal Planner',
  description: 'Plan your family meals for the week',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {/* Main navigation header */}
        <header className="bg-blue-600 text-white shadow-md">
          <nav className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-2xl font-bold">
                Family Meal Planner
              </Link>
              <div className="space-x-4">
                <Link
                  href="/recipes"
                  className="hover:underline font-medium"
                >
                  Recipes
                </Link>
                <Link
                  href="/meal-plan"
                  className="hover:underline font-medium"
                >
                  Meal Plan
                </Link>
              </div>
            </div>
          </nav>
        </header>

        {/* Main content area */}
        <main className="container mx-auto px-4 py-8">{children}</main>

        {/* Footer */}
        <footer className="bg-gray-100 dark:bg-gray-900 mt-12 py-6">
          <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
            <p>Family Meal Planner - Making dinner planning easy</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
