/**
 * Fetch a web page on behalf of an agent, safely.
 *
 * The URL comes from a user (and the model), so it must not be able to reach our own
 * network. Protections, in order:
 *   - only http and https
 *   - the hostname is resolved and EVERY address must be public: loopback (127.x, ::1),
 *     private (10.x, 172.16-31.x, 192.168.x, fc00::/7), link-local (169.254.x incl. the
 *     cloud metadata address, fe80::/10), "this network" (0.x) and multicast/reserved
 *   - redirects are followed by hand (max 5) and each hop goes through the same checks
 *   - 15 second timeout, 2 MB body cap, HTML/text content types only
 *
 * Dev/test escape hatch: with ALLOW_PRIVATE_FETCH=1 private addresses are allowed so tests
 * and local fixtures on localhost work. The flag is IGNORED when NODE_ENV is "production"
 * (which is what Vercel production AND preview builds run with), so it cannot weaken
 * deployed environments even if it is set there by mistake.
 *
 * Known limit: the address is checked before the request, so a hostile DNS server could in
 * theory answer differently the second time (DNS rebinding). Closing that needs pinning the
 * connection to the checked address; not done here.
 */

import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const MAX_REDIRECTS = 5
const TIMEOUT_MS = 15_000
const MAX_BYTES = 2_000_000
const USER_AGENT = 'Mozilla/5.0 (compatible; MealPlannerBot/1.0)'

export class UnsafeUrlError extends Error {}

/** True only in dev/test with the explicit flag. Never in production builds. */
export function privateFetchAllowed(): boolean {
  return process.env.ALLOW_PRIVATE_FETCH === '1' && process.env.NODE_ENV !== 'production'
}

/** Is this IP address one we must not fetch from? */
export function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase()
  const version = isIP(ip)

  if (version === 4) {
    const [a, b] = ip.split('.').map(Number)
    return (
      a === 0 || // "this network"
      a === 10 ||
      a === 127 || // loopback
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local, cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224 // multicast and reserved
    )
  }

  if (version === 6) {
    // IPv4-mapped (::ffff:127.0.0.1 or ::ffff:7f00:1): check the embedded IPv4 address
    const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateAddress(mapped[1])
    const mappedHex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
    if (mappedHex) {
      const hi = parseInt(mappedHex[1], 16)
      const lo = parseInt(mappedHex[2], 16)
      return isPrivateAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`)
    }
    return (
      ip === '::' ||
      ip === '::1' ||
      /^f[cd]/.test(ip) || // unique local fc00::/7
      /^fe[89ab]/.test(ip) || // link-local fe80::/10
      /^ff/.test(ip) // multicast
    )
  }

  return true // not an IP at all: refuse
}

/** Throw UnsafeUrlError unless this URL is allowed to be fetched. */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new UnsafeUrlError(`Not a valid URL: ${rawUrl}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http and https URLs can be fetched')
  }
  if (privateFetchAllowed()) return url

  // URL.hostname keeps brackets around IPv6 literals
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address)

  if (addresses.length === 0) throw new UnsafeUrlError(`Could not resolve ${host}`)
  if (addresses.some(isPrivateAddress)) {
    throw new UnsafeUrlError('That address is not on the public internet, so it will not be fetched')
  }
  return url
}

/** Read at most MAX_BYTES of the response body as text. */
async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let total = 0
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.length
  }
  await reader.cancel().catch(() => {})
  return new TextDecoder().decode(Buffer.concat(chunks)).slice(0, MAX_BYTES)
}

/** Fetch a page as text, with the protections described at the top of this file. */
export async function safeFetchHtml(rawUrl: string): Promise<{ finalUrl: string; html: string }> {
  let current = rawUrl
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertSafeUrl(current)
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,text/plain' },
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) throw new Error(`Redirect (${response.status}) without a location`)
      current = new URL(location, url).toString()
      continue
    }
    if (!response.ok) throw new Error(`The page returned HTTP ${response.status}`)

    const type = response.headers.get('content-type') ?? ''
    if (type && !/text\/|xml/i.test(type)) throw new Error(`Not a web page (content type ${type})`)

    return { finalUrl: url.toString(), html: await readCapped(response) }
  }
  throw new Error('Too many redirects')
}
