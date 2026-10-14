/** POST: local development only (no Blob store configured). Stores one PDF as an "incoming" file. */
import { NextResponse } from 'next/server'
import { isIncomingPath, putPdf, useLocalStorage } from '@/lib/receipts/storage'

export async function POST(request: Request) {
  if (!useLocalStorage()) return NextResponse.json({ error: 'Not available' }, { status: 404 })
  const path = new URL(request.url).searchParams.get('path') ?? ''
  if (!isIncomingPath(path)) return NextResponse.json({ error: 'Bad path' }, { status: 400 })
  await putPdf(path, Buffer.from(await request.arrayBuffer()))
  return NextResponse.json({ ok: true })
}
