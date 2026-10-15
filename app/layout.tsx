/**
 * Root Layout Component
 *
 * Wraps every page: the app's fonts and background, the desktop top bar, the
 * phone tab bar and toast notifications. One light look; there is no dark mode.
 */

import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Figtree } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import TabBar from '@/components/TabBar'
import { Toaster } from 'sonner'
import TimingReporter from '@/components/TimingReporter'

const displayFont = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-display',
  display: 'swap',
})

const bodyFont = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Family Meal Planner',
  description: 'Plan your family meals for the week',
  // iPhone: opens full screen from the home screen (the manifest covers Android and desktop)
  appleWebApp: { capable: true, title: 'Meals', statusBarStyle: 'default' },
  // Older iPhones only read this tag (Next writes the newer mobile-web-app-capable one)
  other: { 'apple-mobile-web-app-capable': 'yes' },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#F3F5F2',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen flex flex-col font-sans">
        <Header />

        {/* Room at the bottom on phones for the tab bar */}
        <main className="flex-1 pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom))] md:pb-8">
          {children}
        </main>

        <TabBar />
        <Toaster position="top-center" />
        <TimingReporter />
      </body>
    </html>
  )
}
