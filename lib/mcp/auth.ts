/**
 * Authentication for /api/mcp.
 *
 * A single shared secret, set in MCP_AUTH_TOKEN. The caller sends it as
 * `Authorization: Bearer <token>` or as `?token=<token>` on the connector URL
 * (Claude.ai custom connectors take a URL, so the query form is the one to use there).
 *
 * Fails closed: in production (which includes Vercel previews) a missing
 * MCP_AUTH_TOKEN rejects every request. Outside production, a missing token
 * allows requests so local development and tests keep working.
 */

import { timingSafeEqual } from 'node:crypto'

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

function extractToken(req: Request): string | null {
  const header = req.headers.get('authorization')
  const bearer = header?.match(/^Bearer\s+(.+)$/i)
  if (bearer) return bearer[1].trim()
  return new URL(req.url).searchParams.get('token')
}

export function isMcpRequestAuthorized(req: Request): boolean {
  const expected = process.env.MCP_AUTH_TOKEN
  if (!expected) return process.env.NODE_ENV !== 'production'
  const provided = extractToken(req)
  return provided !== null && safeEqual(provided, expected)
}
