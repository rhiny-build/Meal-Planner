import { upload } from '@vercel/blob/client'
import { unzipSync } from 'fflate'
import type { ReceiptReport } from '@/lib/receipts/ingest'

export const BATCH_SIZE = 5
const UPLOAD_CONCURRENCY = 4

export interface ExpandedFiles {
  pdfs: { name: string; data: Blob }[]
  ignored: number
}

/** PDFs from the chosen files; zips are opened in the browser, and anything that is not a PDF (the .eml emails) is ignored. */
export async function expandFiles(files: File[]): Promise<ExpandedFiles> {
  const pdfs: ExpandedFiles['pdfs'] = []
  let ignored = 0
  const isPdf = (name: string) => name.toLowerCase().endsWith('.pdf') && !name.includes('__MACOSX')
  for (const file of files) {
    if (file.name.toLowerCase().endsWith('.zip')) {
      // Only PDFs are unpacked; the .eml emails (and folders) are skipped without being read
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
        filter: e => {
          if (isPdf(e.name)) return true
          if (!e.name.endsWith('/')) ignored++
          return false
        },
      })
      for (const [name, bytes] of Object.entries(entries)) {
        pdfs.push({ name: name.split('/').pop()!, data: new Blob([bytes as BlobPart], { type: 'application/pdf' }) })
      }
    } else if (isPdf(file.name)) {
      pdfs.push({ name: file.name, data: file })
    } else {
      ignored++
    }
  }
  return { pdfs, ignored }
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`)
  return json as T
}

export const getRebuildList = () => postJson<{ orderNumbers: string[] }>('/api/admin/receipts/rebuild')
export const rebuildBatch = (orderNumbers: string[]) => postJson<{ reports: ReceiptReport[] }>('/api/admin/receipts/rebuild', { orderNumbers })
export const processBatch = (files: { path: string; name: string }[]) => postJson<{ reports: ReceiptReport[] }>('/api/admin/receipts/process', { files })
export const classifyBatch = () =>
  postJson<{ classified: number; remaining: number; usage: { input: number; output: number } }>('/api/admin/receipts/classify', {})

/** Upload one PDF as an "incoming" file: straight to private Blob, or to this server when no Blob store is configured. */
async function uploadOne(mode: string, name: string, data: Blob): Promise<{ path: string; name: string }> {
  const path = `receipts/incoming/${crypto.randomUUID()}.pdf`
  if (mode === 'blob') {
    await upload(path, data, { access: 'private', handleUploadUrl: '/api/admin/receipts/upload', contentType: 'application/pdf' })
  } else {
    const res = await fetch(`/api/admin/receipts/upload-local?path=${encodeURIComponent(path)}`, { method: 'POST', body: data })
    if (!res.ok) throw new Error(`Upload failed (${res.status})`)
  }
  return { path, name }
}

export async function uploadAll(
  pdfs: ExpandedFiles['pdfs'],
  onProgress: (done: number) => void
): Promise<{ uploaded: { path: string; name: string }[]; failed: { name: string; error: string }[] }> {
  const { mode } = await postJson<{ mode: string }>('/api/admin/receipts/config')
  const uploaded: { path: string; name: string }[] = []
  const failed: { name: string; error: string }[] = []
  let next = 0
  let done = 0
  const worker = async () => {
    while (next < pdfs.length) {
      const pdf = pdfs[next++]
      try {
        uploaded.push(await uploadOne(mode, pdf.name, pdf.data))
      } catch (err) {
        failed.push({ name: pdf.name, error: err instanceof Error ? err.message : 'Upload failed' })
      }
      onProgress(++done)
    }
  }
  await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, worker))
  return { uploaded, failed }
}
