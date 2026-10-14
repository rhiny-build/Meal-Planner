'use client'

import { useState } from 'react'
import type { ReceiptReport } from '@/lib/receipts/ingest'
import { summariseReports, type UploadSummary } from '@/lib/receipts/report'
import {
  BATCH_SIZE, classifyBatch, expandFiles, getRebuildList, processBatch, rebuildBatch, uploadAll,
} from './receiptsApi'

export interface RunProgress {
  label: string
  done: number
  total: number
}

export interface RunResult extends UploadSummary {
  kind: 'upload' | 'rebuild'
  ignoredFiles: number
  uploadFailures: { name: string; error: string }[]
  productsClassified: number
  classifyError?: string
  tokens: { input: number; output: number }
}

const chunk = <T,>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size))

export function useReceiptRun() {
  const [progress, setProgress] = useState<RunProgress | null>(null)
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  /** After parsing, give every new product name an item and aisle (cheap model, batches of 30). */
  const classifyAll = async () => {
    let classified = 0
    const tokens = { input: 0, output: 0 }
    try {
      for (;;) {
        setProgress({ label: 'Sorting products into items', done: classified, total: classified })
        const r = await classifyBatch()
        classified += r.classified
        tokens.input += r.usage.input
        tokens.output += r.usage.output
        if (r.remaining === 0 || r.classified === 0) break
      }
      return { classified, tokens }
    } catch (err) {
      return { classified, tokens, classifyError: err instanceof Error ? err.message : 'Sorting failed' }
    }
  }

  const finish = async (kind: RunResult['kind'], reports: ReceiptReport[], extra: Partial<RunResult>) => {
    const classify = await classifyAll()
    setResult({
      kind, ...summariseReports(reports), ignoredFiles: 0, uploadFailures: [],
      productsClassified: classify.classified, classifyError: classify.classifyError, tokens: classify.tokens, ...extra,
    })
    setProgress(null)
  }

  const run = async (kind: RunResult['kind'], work: () => Promise<void>) => {
    setResult(null)
    setError(null)
    try {
      await work()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setProgress(null)
    }
  }

  const uploadFiles = (files: File[]) =>
    run('upload', async () => {
      setProgress({ label: 'Reading files', done: 0, total: 1 })
      const { pdfs, ignored } = await expandFiles(files)
      if (pdfs.length === 0) throw new Error('No PDF receipts found in those files')
      const total = pdfs.length * 2
      setProgress({ label: 'Uploading receipts', done: 0, total })
      const { uploaded, failed } = await uploadAll(pdfs, done => setProgress({ label: 'Uploading receipts', done, total }))
      const reports: ReceiptReport[] = []
      for (const batch of chunk(uploaded, BATCH_SIZE)) {
        reports.push(...(await processBatch(batch)).reports)
        setProgress({ label: 'Reading receipts', done: pdfs.length + reports.length, total })
      }
      await finish('upload', reports, { ignoredFiles: ignored, uploadFailures: failed })
    })

  const rebuild = () =>
    run('rebuild', async () => {
      setProgress({ label: 'Rebuilding from stored receipts', done: 0, total: 1 })
      const { orderNumbers } = await getRebuildList()
      const reports: ReceiptReport[] = []
      for (const batch of chunk(orderNumbers, BATCH_SIZE)) {
        reports.push(...(await rebuildBatch(batch)).reports)
        setProgress({ label: 'Rebuilding from stored receipts', done: reports.length, total: orderNumbers.length })
      }
      await finish('rebuild', reports, {})
    })

  return { progress, result, error, uploadFiles, rebuild, busy: progress !== null }
}
