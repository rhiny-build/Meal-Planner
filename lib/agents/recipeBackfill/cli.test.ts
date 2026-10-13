import { describe, it, expect } from 'vitest'
import { BACKUP_INSTRUCTIONS, describeDatabase, parseArgs } from './cli'

describe('parseArgs', () => {
  it('defaults to a dry run with polite settings', () => {
    const a = parseArgs([])
    expect(a.mode).toBe('dry-run')
    expect(a.iHaveABackup).toBe(false)
    expect(a.delayMs).toBeGreaterThanOrEqual(1000)
    expect(a.tokenBudget).toBeGreaterThan(0)
  })

  it('--apply takes a file and does not imply the backup confirmation', () => {
    const a = parseArgs(['--apply', 'report.json'])
    expect(a).toMatchObject({ mode: 'apply', reportFile: 'report.json', iHaveABackup: false })
    expect(parseArgs(['--apply', 'report.json', '--i-have-a-backup']).iHaveABackup).toBe(true)
  })

  it('rejects --apply without a file, both modes together, and unknown flags', () => {
    expect(() => parseArgs(['--apply'])).toThrow(/needs a value/)
    expect(() => parseArgs(['--apply', '--i-have-a-backup'])).toThrow(/needs a value/)
    expect(() => parseArgs(['--dry-run', '--apply', 'r.json'])).toThrow(/not both/)
    expect(() => parseArgs(['--yolo'])).toThrow(/Unknown option/)
  })

  it('parses numeric and text options', () => {
    const a = parseArgs(['--delay-ms', '500', '--token-budget', '1000', '--limit', '3', '--only', 'fries', '--out-dir', 'out', '--note', 'hello'])
    expect(a).toMatchObject({ delayMs: 500, tokenBudget: 1000, limit: 3, only: 'fries', outDir: 'out', note: 'hello' })
    expect(() => parseArgs(['--delay-ms', 'soon'])).toThrow(/number/)
  })
})

describe('describeDatabase', () => {
  it('shows host and database but never the credentials', () => {
    const text = describeDatabase('postgresql://user:s3cret@ep-cool.neon.tech:5432/neondb?sslmode=require')
    expect(text).toBe('ep-cool.neon.tech:5432/neondb')
    expect(text).not.toMatch(/s3cret|user/)
  })
  it('copes with a missing or broken value', () => {
    expect(describeDatabase(undefined)).toMatch(/not set/)
    expect(describeDatabase('not a url')).toMatch(/unreadable/)
  })
})

describe('BACKUP_INSTRUCTIONS', () => {
  it('does not assume the provider and gives a provider-independent command', () => {
    expect(BACKUP_INSTRUCTIONS).toMatch(/confirm/i)
    expect(BACKUP_INSTRUCTIONS).toMatch(/backup\/<YYYYMMDD>-S07/)
    expect(BACKUP_INSTRUCTIONS).toMatch(/pg_dump/)
    expect(BACKUP_INSTRUCTIONS).toMatch(/--i-have-a-backup/)
  })
})
