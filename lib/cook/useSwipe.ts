/**
 * useSwipe
 *
 * Touch handlers that call `onSwipeLeft` / `onSwipeRight` for a mostly
 * horizontal drag of at least 50px. Spread the result on the element to
 * make swipeable. Mouse and keyboard users are not affected.
 */

'use client'

import { useRef } from 'react'
import type { TouchEvent } from 'react'

const SWIPE_THRESHOLD_PX = 50

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

export function useSwipe({ onSwipeLeft, onSwipeRight }: SwipeHandlers) {
  const start = useRef<{ x: number; y: number } | null>(null)

  return {
    onTouchStart: (event: TouchEvent) => {
      const touch = event.touches[0]
      start.current = { x: touch.clientX, y: touch.clientY }
    },
    onTouchEnd: (event: TouchEvent) => {
      if (!start.current) return
      const touch = event.changedTouches[0]
      const deltaX = touch.clientX - start.current.x
      const deltaY = touch.clientY - start.current.y
      start.current = null
      if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return
      if (deltaX < 0) onSwipeLeft?.()
      else onSwipeRight?.()
    },
  }
}
