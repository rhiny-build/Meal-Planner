/**
 * TimingReporter
 *
 * Sends how long pages take to be usable, as the browser sees it, to
 * /api/timing (shown on /admin/timings). A full page load (opening the app)
 * reports time to first byte and time until usable; moving between pages
 * inside the app reports the time from the tap until the new page is usable.
 * "Usable" is the page's own ready signal (usePageReady) or, for pages that
 * arrive complete from the server, the moment the page is on screen.
 * Sent with sendBeacon after the page is up, so it never slows a page.
 */

'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { PAGE_PENDING_EVENT, PAGE_READY_EVENT } from '@/lib/timing/usePageReady'

const FALLBACK_AFTER_MS = 10_000

function send(body: Record<string, unknown>): void {
  try {
    const payload = new Blob([JSON.stringify(body)], { type: 'application/json' })
    if (!navigator.sendBeacon?.('/api/timing', payload)) {
      void fetch('/api/timing', { method: 'POST', body: payload, keepalive: true })
    }
  } catch {
    // Measuring is optional
  }
}

export default function TimingReporter() {
  const pathname = usePathname()
  const pathRef = useRef(pathname)
  pathRef.current = pathname
  const state = useRef({ navStart: 0, isHardLoad: true, isPending: false, isDone: false })

  const finish = useRef(() => {
    const current = state.current
    if (current.isDone) return
    current.isDone = true
    const totalMs = Math.round(performance.now() - current.navStart)
    if (!current.isHardLoad) return send({ kind: 'nav', route: pathRef.current, totalMs })
    const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    send({ kind: 'load', route: pathRef.current, totalMs, ttfbMs: navigation ? Math.round(navigation.responseStart) : undefined })
  })

  useEffect(() => {
    const startNavigation = () => {
      state.current = { navStart: performance.now(), isHardLoad: false, isPending: false, isDone: false }
    }
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (link && link.origin === window.location.origin && link.target !== '_blank') startNavigation()
    }
    const onPending = () => {
      state.current.isPending = true
    }
    const onReady = () => finish.current()
    // A page that declares itself pending but never says ready still gets measured
    const fallback = setTimeout(onReady, FALLBACK_AFTER_MS)
    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', startNavigation)
    window.addEventListener(PAGE_PENDING_EVENT, onPending)
    window.addEventListener(PAGE_READY_EVENT, onReady)
    return () => {
      clearTimeout(fallback)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', startNavigation)
      window.removeEventListener(PAGE_PENDING_EVENT, onPending)
      window.removeEventListener(PAGE_READY_EVENT, onReady)
    }
  }, [])

  // This path is on screen. A page that loads its own data says "pending" in its effects (which run in this
  // same tick) and finishes on its ready signal; any other page is usable now.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!state.current.isPending) finish.current()
    }, 0)
    return () => clearTimeout(timer)
  }, [pathname])

  return null
}
