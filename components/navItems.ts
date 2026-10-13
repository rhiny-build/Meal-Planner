/**
 * The app's main destinations, shared by the phone tab bar and the desktop top bar.
 * Settings is reached from the desktop bar and from the gear on each page header;
 * Agent Runs and Admin live under Settings.
 */

export type NavItem = {
  href: string
  label: string
  /** Paths starting with any of these count as "on this tab". */
  matchPrefixes: string[]
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Tonight', matchPrefixes: [] },
  { href: '/recipes', label: 'Recipes', matchPrefixes: ['/recipes'] },
  { href: '/meal-plan', label: 'Week', matchPrefixes: ['/meal-plan'] },
  { href: '/shopping-list', label: 'Shopping', matchPrefixes: ['/shopping-list', '/purchase-history'] },
]

export const SETTINGS_NAV_ITEM: NavItem = {
  href: '/settings',
  label: 'Settings',
  matchPrefixes: ['/settings', '/agent-runs', '/admin'],
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === '/') return pathname === '/'
  return item.matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
