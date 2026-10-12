import { afterEach, describe, expect, it, vi } from 'vitest'
import { isMcpRequestAuthorized } from './auth'

const url = 'https://app.example.com/api/mcp'

function req(opts: { query?: string; auth?: string } = {}) {
  return new Request(url + (opts.query ?? ''), {
    headers: opts.auth ? { authorization: opts.auth } : {},
  })
}

describe('isMcpRequestAuthorized', () => {
  afterEach(() => vi.unstubAllEnvs())

  describe('with MCP_AUTH_TOKEN set', () => {
    it('accepts the token as a bearer header', () => {
      vi.stubEnv('MCP_AUTH_TOKEN', 's3cret')
      expect(isMcpRequestAuthorized(req({ auth: 'Bearer s3cret' }))).toBe(true)
    })

    it('accepts the token in the query string', () => {
      vi.stubEnv('MCP_AUTH_TOKEN', 's3cret')
      expect(isMcpRequestAuthorized(req({ query: '?token=s3cret' }))).toBe(true)
    })

    it('rejects a missing, wrong or different-length token', () => {
      vi.stubEnv('MCP_AUTH_TOKEN', 's3cret')
      expect(isMcpRequestAuthorized(req())).toBe(false)
      expect(isMcpRequestAuthorized(req({ query: '?token=wrong!' }))).toBe(false)
      expect(isMcpRequestAuthorized(req({ query: '?token=s3' }))).toBe(false)
      expect(isMcpRequestAuthorized(req({ auth: 'Bearer nope' }))).toBe(false)
      expect(isMcpRequestAuthorized(req({ auth: 'Basic s3cret' }))).toBe(false)
    })
  })

  describe('with MCP_AUTH_TOKEN unset', () => {
    it('rejects everything in production', () => {
      vi.stubEnv('MCP_AUTH_TOKEN', '')
      vi.stubEnv('NODE_ENV', 'production')
      expect(isMcpRequestAuthorized(req())).toBe(false)
      expect(isMcpRequestAuthorized(req({ query: '?token=' }))).toBe(false)
    })

    it('allows requests outside production (local dev and tests)', () => {
      vi.stubEnv('MCP_AUTH_TOKEN', '')
      vi.stubEnv('NODE_ENV', 'development')
      expect(isMcpRequestAuthorized(req())).toBe(true)
    })
  })
})
