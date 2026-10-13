/**
 * PageHeader
 *
 * Page title block shared by the main pages: small line above (date, range),
 * display-font title, an optional right-hand slot, and on phones a Settings gear.
 */

import Link from 'next/link'
import NavIcon from './NavIcon'

interface PageHeaderProps {
  title: string
  eyebrow?: string
  /** Shown to the right of the title (e.g. a note chip or an action button). */
  trailing?: React.ReactNode
  /** Hide the phone Settings gear (on Settings itself). */
  hideSettingsLink?: boolean
}

export default function PageHeader({ title, eyebrow, trailing, hideSettingsLink = false }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 pt-6 pb-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        {eyebrow && <span className="text-sm text-ink-soft">{eyebrow}</span>}
        <h1 className="font-display text-3xl font-bold text-ink">{title}</h1>
      </div>
      <div className="flex items-center gap-2 flex-none">
        {trailing}
        {!hideSettingsLink && (
        <Link
          href="/settings"
          aria-label="Settings"
          className="md:hidden w-11 h-11 rounded-card bg-surface text-ink flex items-center justify-center"
        >
          <NavIcon name="Settings" />
        </Link>
        )}
      </div>
    </div>
  )
}
