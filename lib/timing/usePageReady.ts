/**
 * usePageReady
 *
 * A page that loads its data in the browser (Tonight, Week, Recipes) calls
 * this with "is the real content on screen yet". The timing reporter then
 * measures until that moment, not until the "Loading..." placeholder showed.
 * Pages that arrive complete from the server don't need it.
 */

'use client'

import { useEffect } from 'react'

export const PAGE_PENDING_EVENT = 'mealplanner:page-pending'
export const PAGE_READY_EVENT = 'mealplanner:page-ready'

export function usePageReady(isReady: boolean): void {
  useEffect(() => {
    window.dispatchEvent(new Event(PAGE_PENDING_EVENT))
  }, [])
  useEffect(() => {
    if (isReady) window.dispatchEvent(new Event(PAGE_READY_EVENT))
  }, [isReady])
}
