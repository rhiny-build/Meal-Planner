/**
 * POST: hands the browser a short-lived token so it can upload a receipt PDF straight to private Blob.
 * The PDF never passes through a Vercel function, so function body-size limits do not apply.
 */
import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { isIncomingPath } from '@/lib/receipts/storage'

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async pathname => {
        if (!isIncomingPath(pathname)) throw new Error('Unexpected upload path')
        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 20 * 1024 * 1024,
          addRandomSuffix: false,
          allowOverwrite: true,
        }
      },
      // The browser calls /process itself once every file is up, so nothing to do here.
      onUploadCompleted: async () => {},
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 400 })
  }
}
