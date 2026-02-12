/**
 * useAutoRefresh Hook
 *
 * Re-runs a callback whenever the browser tab becomes visible again.
 * Uses a ref so the listener is registered once but always calls
 * the latest callback (no stale closures).
 */

import { useEffect, useRef } from 'react'

export function useAutoRefresh(callback: () => void) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        callbackRef.current()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])
}
