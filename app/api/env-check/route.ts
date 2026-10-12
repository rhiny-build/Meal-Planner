/**
 * TEMPORARY diagnostic: reports which env vars the running app can see.
 * Shows only true/false, never values. Delete before merging to main.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const NAMES = [
  'ANTHROPIC_API_KEY',
  'DATABASE_URL',
  'DATABASE_URL_UNPOOLED',
  'OPENAI_API_KEY',
  'BLOB_READ_WRITE_TOKEN',
  'MCP_AUTH_TOKEN',
  'NODE_ENV',
  'VERCEL_ENV',
]

export async function GET() {
  const present = Object.fromEntries(NAMES.map((n) => [n, Boolean(process.env[n])]))
  const anthropicLike = Object.keys(process.env).filter((k) => k.toUpperCase().includes('ANTHROPIC'))
  return NextResponse.json({
    present,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    gitBranch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || null,
    anthropicLikeNames: anthropicLike,
  })
}
