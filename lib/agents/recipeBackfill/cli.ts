/** Argument parsing and the backup message for scripts/rehaul/backfillRecipes.ts. Kept here so it can be unit tested. */

export interface BackfillArgs {
  mode: 'dry-run' | 'apply'
  reportFile: string | null
  iHaveABackup: boolean
  delayMs: number
  tokenBudget: number
  only?: string
  limit?: number
  outDir: string
  note: string | null
}

export function parseArgs(argv: string[]): BackfillArgs {
  const args: BackfillArgs = {
    mode: 'dry-run',
    reportFile: null,
    iHaveABackup: false,
    delayMs: 3000,
    tokenBudget: 1_500_000,
    outDir: '.',
    note: null,
  }
  let sawDryRun = false
  const value = (i: number, flag: string) => {
    const v = argv[i + 1]
    if (v === undefined || v.startsWith('--')) throw new Error(`${flag} needs a value`)
    return v
  }
  const number = (i: number, flag: string) => {
    const n = Number(value(i, flag))
    if (!Number.isFinite(n) || n < 0) throw new Error(`${flag} needs a non-negative number`)
    return n
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    switch (a) {
      case '--dry-run':
        sawDryRun = true
        break
      case '--apply':
        args.mode = 'apply'
        args.reportFile = value(i++, a)
        break
      case '--i-have-a-backup':
        args.iHaveABackup = true
        break
      case '--delay-ms':
        args.delayMs = number(i++, a)
        break
      case '--token-budget':
        args.tokenBudget = number(i++, a)
        break
      case '--limit':
        args.limit = number(i++, a)
        break
      case '--only':
        args.only = value(i++, a)
        break
      case '--out-dir':
        args.outDir = value(i++, a)
        break
      case '--note':
        args.note = value(i++, a)
        break
      default:
        throw new Error(`Unknown option ${a}`)
    }
  }
  if (sawDryRun && args.mode === 'apply') throw new Error('Use either --dry-run or --apply, not both')
  return args
}

/** Host and database name of a connection string, never the user or password. */
export function describeDatabase(url: string | undefined): string {
  if (!url) return '(DATABASE_URL is not set)'
  try {
    const u = new URL(url)
    return `${u.hostname}${u.port ? `:${u.port}` : ''}${u.pathname}`
  } catch {
    return '(unreadable DATABASE_URL)'
  }
}

export const BACKUP_INSTRUCTIONS = `
Applying changes the recipe book in place. Take a backup of the database first, then run again with --i-have-a-backup.

Which provider hosts this database? The rehaul plan says Neon, but confirm before relying on it.

  Neon (per the rehaul plan):  Neon console > your project > Branches > create a branch from "main"
                               named backup/<YYYYMMDD>-S07. It takes seconds and is easy to restore from.
  Any provider (works anywhere Postgres does), using the DIRECT (unpooled) connection string:
                               pg_dump "$DATABASE_URL_UNPOOLED" -Fc -f recipe-book-backup-$(date +%Y%m%d).dump
                               (restore later with pg_restore --clean --dbname <url> <file>)
  Supabase:                    Dashboard > Database > Backups (or the pg_dump line above).

Nothing was changed.
`
