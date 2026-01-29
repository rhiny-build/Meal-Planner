/**
 * Root Layout Component
 *
 * This is the main layout wrapper for the entire app.
 * Supports light and dark themes with toggle.
 */

import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import Header from '@/components/Header'

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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <Header />

          {/* Main content area */}
          <main className="flex-1">{children}</main>

          {/* Footer */}
          <footer className="bg-gray-100 dark:bg-neutral-800 border-t border-gray-200 dark:border-neutral-700 py-6">
            <div className="container mx-auto px-4 text-center text-gray-600 dark:text-neutral-500">
              <p>Family Meal Planner - Making dinner planning easy</p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}
