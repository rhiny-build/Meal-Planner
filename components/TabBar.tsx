/**
 * TabBar
 *
 * Bottom tab bar on phones: Tonight, Recipes, Week, Shopping. Hidden from md up,
 * where TopNav takes over.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NavIcon from './NavIcon'
import { MAIN_NAV_ITEMS, isNavItemActive } from './navItems'

export default function TabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-line pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4 h-tabbar">
        {MAIN_NAV_ITEMS.map((item) => {
          const isActive = isNavItemActive(item, pathname)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`h-full min-h-11 flex flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                  isActive ? 'text-primary' : 'text-ink-soft'
                }`}
              >
                <span
                  className={`px-4 py-1 rounded-full ${isActive ? 'bg-primary-soft' : ''}`}
                >
                  <NavIcon name={item.label} />
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
