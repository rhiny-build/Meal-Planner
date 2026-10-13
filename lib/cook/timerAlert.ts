/**
 * Cook mode timer alert: a short beep sequence plus vibration where supported.
 *
 * Browsers only allow sound after a tap, so `unlockTimerAudio` is called from
 * the Start button; the alert later reuses that unlocked audio context.
 * Everything here fails quietly: no sound or vibration is never an error.
 */

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioContext) return audioContext
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    audioContext = new Ctor()
  } catch {
    audioContext = null
  }
  return audioContext
}

/** Call from a tap handler so the alert can sound later. */
export function unlockTimerAudio(): void {
  const context = getAudioContext()
  if (context && context.state === 'suspended') void context.resume().catch(() => {})
}

/** Vibration pattern used when a timer finishes. */
export const TIMER_VIBRATION_PATTERN = [400, 200, 400, 200, 800]

export function alertTimerFinished(): void {
  try {
    navigator.vibrate?.(TIMER_VIBRATION_PATTERN)
  } catch {
    // vibration unsupported
  }
  const context = getAudioContext()
  if (!context) return
  try {
    for (let beep = 0; beep < 4; beep++) {
      const start = context.currentTime + beep * 0.5
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.4)
    }
  } catch {
    // audio unavailable
  }
}
