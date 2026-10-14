/** GET: how the browser should upload (straight to Blob, or to this server when no Blob store is configured). */
import { NextResponse } from 'next/server'
import { useLocalStorage } from '@/lib/receipts/storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ mode: useLocalStorage() ? 'local' : 'blob' })
}
