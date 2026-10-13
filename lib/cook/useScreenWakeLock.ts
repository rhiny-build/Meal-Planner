/**
 * useScreenWakeLock
 *
 * Keeps the screen on while cooking, where the browser supports the Screen
 * Wake Lock API. The browser releases the lock when the tab is hidden, so it
 * is requested again when the tab becomes visible. Returns whether a lock is
 * currently held, so the screen can say so. Unsupported or refused is fine.
 */

'use client'

import { useEffect, useState } from 'react'

interface WakeLockSentinelLike {
  release: () => Promise<void>
  addEventListener: (type: 'release', listener: () => void) => void
}

export function useScreenWakeLock(): boolean {
  const [isHeld, setIsHeld] = useState(false)

  useEffect(() => {
    const wakeLock = (navigator as unknown as {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
    }).wakeLock
    if (!wakeLock) return

    let sentinel: WakeLockSentinelLike | null = null
    let isActive = true

    const request = async () => {
      try {
        const lock = await wakeLock.request('screen')
        if (!isActive) {
          void lock.release().catch(() => {})
          return
        }
        sentinel = lock
        setIsHeld(true)
        lock.addEventListener('release', () => setIsHeld(false))
      } catch {
        setIsHeld(false)
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      isActive = false
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void sentinel?.release().catch(() => {})
    }
  }, [])

  return isHeld
}
