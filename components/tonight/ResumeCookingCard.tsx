/**
 * ResumeCookingCard
 *
 * Shown at the top of Tonight while a cook session is in progress (see
 * lib/cook/cookSession.ts): one tap goes back to the recipe, at the step and
 * with the timers it had. Reads the browser's storage after the page loads
 * and again when the app comes back to the front.
 */

'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { loadCookSession, type CookSession } from '@/lib/cook/cookSession'
import { useAutoRefresh } from '@/lib/hooks/useAutoRefresh'

export default function ResumeCookingCard() {
  const [session, setSession] = useState<CookSession | null>(null)
  const refresh = useCallback(() => setSession(loadCookSession()), [])

  useEffect(refresh, [refresh])
  useAutoRefresh(refresh)

  if (!session) return null
  return (
    <Link
      href={`/recipes/${session.recipeId}/cook`}
      className="min-h-14 bg-accent text-ink rounded-card px-4 py-3 flex items-center justify-between gap-3"
      data-testid="resume-cooking"
    >
      <span className="flex flex-col min-w-0">
        <span className="font-semibold text-[17px]">Resume cooking</span>
        {session.recipeName && <span className="text-[13px] truncate">{session.recipeName}</span>}
      </span>
      <span aria-hidden className="text-xl">&rarr;</span>
    </Link>
  )
}
