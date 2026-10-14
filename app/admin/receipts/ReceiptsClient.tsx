'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Button from '@/components/Button'
import { describeMismatch } from '@/lib/receipts/report'
import { useReceiptRun } from './useReceiptRun'

export default function ReceiptsClient() {
  const { progress, result, error, uploadFiles, rebuild, busy } = useReceiptRun()
  const input = useRef<HTMLInputElement>(null)

  return (
    <div className="max-w-xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div>
        <Link href="/settings" className="text-sm font-semibold text-primary">Settings</Link>
        <h1 className="font-display text-2xl font-bold">Receipts</h1>
        <p className="text-ink-soft">Upload Sainsbury&apos;s receipt PDFs, many at once, or a zip. Emails (.eml) in the zip are ignored. Uploading a receipt twice changes nothing.</p>
      </div>

      <div className="bg-surface rounded-card p-4 flex flex-col gap-3">
        <input
          ref={input}
          type="file"
          multiple
          accept=".pdf,.zip,application/pdf,application/zip"
          className="hidden"
          data-testid="receipt-files"
          onChange={e => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (files.length > 0) uploadFiles(files)
          }}
        />
        <Button onClick={() => input.current?.click()} disabled={busy}>Choose receipts or a zip</Button>
        <Button variant="secondary" onClick={rebuild} disabled={busy}>Rebuild from stored receipts</Button>
        <p className="text-xs text-ink-soft">Rebuild re-reads every stored receipt and replaces the purchase history built from them. Safe to run any time.</p>
      </div>

      {progress && (
        <div className="bg-surface rounded-card p-4" role="status">
          <p className="font-semibold">{progress.label}</p>
          <progress className="w-full h-3" max={Math.max(progress.total, 1)} value={progress.done} />
          <p className="text-sm text-ink-soft">{progress.done} of {progress.total}</p>
        </div>
      )}

      {error && <p className="bg-danger-soft text-danger rounded-card p-4" role="alert">{error}</p>}

      {result && (
        <div className="bg-surface rounded-card p-4 flex flex-col gap-3" data-testid="receipt-report">
          <p className="font-display text-lg font-bold">{result.kind === 'upload' ? 'Upload report' : 'Rebuild report'}</p>
          <ul className="text-sm flex flex-col gap-1">
            <li>{result.receipts} receipts read ({result.newReceipts} new, {result.replacedReceipts} already stored)</li>
            <li>{result.items} items</li>
            {result.ignoredFiles > 0 && <li>{result.ignoredFiles} other files ignored</li>}
            <li>{result.productsClassified} new products sorted into items{result.tokens.input > 0 && ` (${result.tokens.input + result.tokens.output} tokens)`}</li>
          </ul>
          {result.classifyError && <p className="text-danger text-sm">Sorting stopped: {result.classifyError}. Press Rebuild to finish.</p>}
          <Section title={`Count mismatches (${result.mismatches.length})`} empty="Every receipt's parsed count matches its own count." lines={result.mismatches.map(describeMismatch)} />
          <Section title={`Could not read (${result.failed.length + result.uploadFailures.length})`} empty="Every receipt was read." lines={[...result.failed.map(f => `${f.file}: ${f.error}`), ...result.uploadFailures.map(f => `${f.name}: ${f.error}`)]} />
          <Link href="/shopping-list" className="font-semibold text-primary min-h-11 flex items-center">Open Next week</Link>
        </div>
      )}
    </div>
  )
}

function Section({ title, empty, lines }: { title: string; empty: string; lines: string[] }) {
  return (
    <div>
      <p className="font-semibold text-sm">{title}</p>
      {lines.length === 0 ? <p className="text-sm text-ink-soft">{empty}</p> : <ul className="text-sm list-disc pl-5">{lines.map(l => <li key={l}>{l}</li>)}</ul>}
    </div>
  )
}
