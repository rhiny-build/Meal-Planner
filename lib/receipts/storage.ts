/**
 * Raw receipt storage. Production: private Vercel Blob. Without BLOB_READ_WRITE_TOKEN (local dev,
 * tests, Playwright): files under .receipts-dev/, so the whole flow runs without a Blob store.
 * Paths: receipts/incoming/<random>.pdf while a browser upload waits to be parsed,
 * receipts/<orderNumber>.pdf for the permanent copy.
 */

import { promises as fs } from 'fs'
import path from 'path'
import { put, get, del } from '@vercel/blob'

const LOCAL_ROOT = path.join(process.cwd(), '.receipts-dev')

export const useLocalStorage = () => !process.env.BLOB_READ_WRITE_TOKEN

export const incomingPath = (id: string) => `receipts/incoming/${id}.pdf`
export const receiptPath = (orderNumber: string) => `receipts/${orderNumber}.pdf`

/** Only paths we hand out are accepted from the browser (no ".." or other prefixes). */
export const isIncomingPath = (p: string) => /^receipts\/incoming\/[A-Za-z0-9_-]+\.pdf$/.test(p)

function localFile(pathname: string): string {
  const full = path.join(LOCAL_ROOT, pathname)
  if (!full.startsWith(LOCAL_ROOT + path.sep)) throw new Error('Bad path')
  return full
}

export async function putPdf(pathname: string, data: Buffer): Promise<void> {
  if (useLocalStorage()) {
    await fs.mkdir(path.dirname(localFile(pathname)), { recursive: true })
    await fs.writeFile(localFile(pathname), data)
    return
  }
  await put(pathname, data, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/pdf' })
}

export async function getPdf(pathname: string): Promise<Buffer | null> {
  if (useLocalStorage()) {
    try {
      return await fs.readFile(localFile(pathname))
    } catch {
      return null
    }
  }
  const result = await get(pathname, { access: 'private', useCache: false })
  if (!result || result.statusCode !== 200) return null
  return Buffer.from(await new Response(result.stream).arrayBuffer())
}

export async function deletePdf(pathname: string): Promise<void> {
  if (useLocalStorage()) {
    await fs.rm(localFile(pathname), { force: true })
    return
  }
  await del(pathname)
}
