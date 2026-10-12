import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const dns = vi.hoisted(() => ({ lookup: vi.fn() }))
vi.mock('node:dns/promises', () => ({ ...dns, default: dns }))

import { isPrivateAddress, assertSafeUrl, safeFetchHtml, privateFetchAllowed, UnsafeUrlError } from './safeFetch'

const mockFetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
  vi.stubEnv('ALLOW_PRIVATE_FETCH', '')
  dns.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1', '127.1.2.3', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', '0.0.0.0', '100.64.0.1', '224.0.0.1',
    '::1', '::', 'fe80::1', 'fd12:3456::1', '::ffff:127.0.0.1', '::ffff:7f00:1', 'ff02::1',
  ])('blocks %s', (address) => {
    expect(isPrivateAddress(address)).toBe(true)
  })

  it.each(['93.184.216.34', '8.8.8.8', '172.15.0.1', '172.32.0.1', '2606:4700:4700::1111'])(
    'allows %s',
    (address) => {
      expect(isPrivateAddress(address)).toBe(false)
    }
  )
})

describe('assertSafeUrl', () => {
  it('rejects non-http schemes and invalid URLs', async () => {
    await expect(assertSafeUrl('file:///etc/passwd')).rejects.toThrow(UnsafeUrlError)
    await expect(assertSafeUrl('ftp://example.com/x')).rejects.toThrow('http')
    await expect(assertSafeUrl('not a url')).rejects.toThrow('valid URL')
  })

  it('rejects loopback, private and metadata addresses, as literals and via DNS', async () => {
    await expect(assertSafeUrl('http://127.0.0.1:3000/x')).rejects.toThrow('public internet')
    await expect(assertSafeUrl('http://[::1]/x')).rejects.toThrow('public internet')
    await expect(assertSafeUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow('public internet')
    dns.lookup.mockResolvedValue([{ address: '10.0.0.8', family: 4 }])
    await expect(assertSafeUrl('https://internal.example.com/')).rejects.toThrow('public internet')
  })

  it('rejects a host if ANY of its addresses is private', async () => {
    dns.lookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ])
    await expect(assertSafeUrl('https://sneaky.example.com/')).rejects.toThrow('public internet')
  })

  it('rejects a host that does not resolve', async () => {
    dns.lookup.mockRejectedValue(new Error('ENOTFOUND'))
    await expect(assertSafeUrl('https://nope.invalid/')).rejects.toThrow('Could not resolve')
  })

  it('accepts a public host', async () => {
    await expect(assertSafeUrl('https://example.com/recipe')).resolves.toBeInstanceOf(URL)
  })
})

describe('the dev flag', () => {
  it('lets localhost through only with ALLOW_PRIVATE_FETCH=1 outside production', async () => {
    vi.stubEnv('ALLOW_PRIVATE_FETCH', '1')
    vi.stubEnv('NODE_ENV', 'development')
    expect(privateFetchAllowed()).toBe(true)
    await expect(assertSafeUrl('http://localhost:4000/recipe')).resolves.toBeInstanceOf(URL)
  })

  it('is ignored in production, even when set', async () => {
    vi.stubEnv('ALLOW_PRIVATE_FETCH', '1')
    vi.stubEnv('NODE_ENV', 'production')
    expect(privateFetchAllowed()).toBe(false)
    await expect(assertSafeUrl('http://127.0.0.1:4000/recipe')).rejects.toThrow('public internet')
  })

  it('is off by default', () => {
    expect(privateFetchAllowed()).toBe(false)
  })
})

const page = (body: string, init: ResponseInit = {}) =>
  new Response(body, { status: 200, headers: { 'content-type': 'text/html' }, ...init })

describe('safeFetchHtml', () => {
  it('returns the html and final url', async () => {
    mockFetch.mockResolvedValue(page('<p>hi</p>'))
    await expect(safeFetchHtml('https://example.com/r')).resolves.toEqual({
      finalUrl: 'https://example.com/r',
      html: '<p>hi</p>',
    })
  })

  it('follows a redirect and re-checks the new address', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/admin' } }))
      .mockResolvedValueOnce(page('secret'))
    await expect(safeFetchHtml('https://example.com/r')).rejects.toThrow('public internet')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('follows a safe relative redirect', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: '/new' } }))
      .mockResolvedValueOnce(page('ok'))
    const result = await safeFetchHtml('https://example.com/old')
    expect(result.finalUrl).toBe('https://example.com/new')
  })

  it('gives up after too many redirects', async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 302, headers: { location: '/again' } }))
    await expect(safeFetchHtml('https://example.com/loop')).rejects.toThrow('Too many redirects')
  })

  it('reports HTTP errors and non-page content', async () => {
    mockFetch.mockResolvedValueOnce(new Response('no', { status: 403 }))
    await expect(safeFetchHtml('https://example.com/a')).rejects.toThrow('HTTP 403')
    mockFetch.mockResolvedValueOnce(new Response('%PDF', { status: 200, headers: { 'content-type': 'application/pdf' } }))
    await expect(safeFetchHtml('https://example.com/b')).rejects.toThrow('Not a web page')
  })

  it('caps the body size', async () => {
    mockFetch.mockResolvedValue(page('x'.repeat(2_500_000)))
    const { html } = await safeFetchHtml('https://example.com/big')
    expect(html.length).toBeLessThanOrEqual(2_000_000)
  })
})
