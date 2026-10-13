/**
 * Header (desktop top bar)
 *
 * Brand plus the main destinations and Settings. Hidden on phones, where the
 * bottom TabBar is the navigation.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MAIN_NAV_ITEMS, SETTINGS_NAV_ITEM, isNavItemActive } from './navItems'

export default function Header() {
  const pathname = usePathname()
  const items = [...MAIN_NAV_ITEMS, SETTINGS_NAV_ITEM]

  return (
    <header className="hidden md:block bg-surface border-b border-line">
      <nav aria-label="Main" className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-bold text-primary">
          Family Meal Planner
        </Link>
        <ul className="flex items-center gap-1">
          {items.map((item) => {
            const isActive = isNavItemActive(item, pathname)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-h-11 px-4 inline-flex items-center rounded-card font-semibold transition-colors ${
                    isActive ? 'bg-primary-soft text-primary' : 'text-ink-soft hover:bg-ground hover:text-ink'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}
