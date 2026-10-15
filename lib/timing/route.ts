/**
 * Route names for the timing records: query strings dropped, ids and dates
 * replaced by placeholders, so "/recipes/ckx9..." and "/recipes/cky1..." are one page.
 */

const MAX_LENGTH = 80

export function normaliseRoute(raw: string): string {
  const path = raw.split(/[?#]/)[0] || '/'
  const cleaned = path
    .split('/')
    .map((part) => (/^c[a-z0-9]{20,}$/.test(part) || /^\d{4}-\d{2}-\d{2}$/.test(part) || /^[0-9a-f-]{24,}$/i.test(part) ? ':id' : part))
    .join('/')
  return cleaned.slice(0, MAX_LENGTH) || '/'
}
