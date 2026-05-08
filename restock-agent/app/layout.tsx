import type { Metadata } from 'next'
import RunAgentButton from '@/components/RunAgentButton'
import './globals.css'

export const metadata: Metadata = {
  title: 'Restock Agent',
  description: 'Classify Sainsbury\'s receipt items into restock candidates',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Restock Agent</h1>
          <RunAgentButton />
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
