/** Markdown view of the backfill report (the JSON is what --apply reads). */

import type { BackfillAction, BackfillReport, ReportEntry } from './types'

const SECTIONS: { action: BackfillAction; title: string; blurb: string }[] = [
  { action: 'enrich', title: 'Enrich from the source page', blurb: 'Only empty fields are filled; nothing you entered is overwritten.' },
  { action: 'quick', title: 'Reclassify as quick', blurb: 'kind changes from full to quick. Quick items have no method.' },
  { action: 'duplicate', title: 'Duplicates (merge proposed, never applied unless you approve)', blurb: 'To approve a merge, set "approved": true on that entry in the JSON. Meal-plan slots are re-pointed to the recipe that stays first, then the copy is deleted.' },
  { action: 'leave', title: 'Leave alone', blurb: 'Family recipes without a link, links that failed, and pages with nothing to add.' },
]

const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\n/g, ' ')

function row(e: ReportEntry): string {
  const run = e.runId ? `\`${e.runId}\`` : ''
  return `| ${cell(e.name)} | ${cell(e.action === 'leave' ? e.reason : e.summary)} | ${cell(e.action === 'leave' ? '' : e.reason)} | ${run} |`
}

export function renderMarkdown(report: BackfillReport): string {
  const out: string[] = []
  out.push('# Recipe backfill report (dry run)')
  out.push('')
  if (report.note) out.push(`> **${report.note}**`, '')
  out.push(
    `Generated ${report.generatedAt} against \`${report.database}\` with \`${report.model}\`. ${report.recipesInBook} recipes in the book.`,
    '',
    '**Nothing has been changed.** To apply: delete the entries you do not want from the JSON file, then run the script with `--apply <file> --i-have-a-backup` (see the script for how to take a backup first).',
    ''
  )
  out.push('## Summary', '', '| Action | Recipes |', '|---|---|')
  for (const s of SECTIONS) out.push(`| ${s.action} | ${report.summary[s.action]} |`)
  out.push(`| **total** | ${report.entries.length} |`, '')
  const t = report.tokens
  out.push(
    `Agent runs: ${t.runs} (trigger \`batch\`, visible on /agent-runs). Tokens: ${t.inputTokens.toLocaleString('en-GB')} in, ${t.outputTokens.toLocaleString('en-GB')} out (${(t.inputTokens + t.outputTokens).toLocaleString('en-GB')} total).`
  )
  if (report.budgetExceeded) out.push('', '**The token budget ran out: some links were not checked (listed under "leave"). Re-run with a larger budget.**')
  out.push('')

  for (const s of SECTIONS) {
    const list = report.entries.filter((e) => e.action === s.action)
    if (list.length === 0) continue
    out.push(`## ${s.title} (${list.length})`, '', s.blurb, '')
    out.push(s.action === 'leave' ? '| Recipe | Why | | Agent run |' : '| Recipe | What would change | Why | Agent run |', '|---|---|---|---|')
    list.forEach((e) => out.push(row(e)))
    out.push('')
  }
  return out.join('\n')
}
