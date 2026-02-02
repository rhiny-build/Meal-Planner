/**
 * SearchableSelect Theme Configuration
 *
 * Accent color styles for dark and light themes.
 */

export type AccentColor = 'amber' | 'fuchsia' | 'cyan' | 'lime' | 'default'

interface AccentStyle {
  border: string
  text: string
  focus: string
}

type AccentStyles = Record<AccentColor, AccentStyle>

export const darkAccentStyles: AccentStyles = {
  amber: {
    border: '!border-l-4 !border-l-amber-500 !border-y-0 !border-r-0',
    text: '!text-amber-400',
    focus: '!border-l-amber-400',
  },
  fuchsia: {
    border: '!border-l-4 !border-l-fuchsia-500 !border-y-0 !border-r-0',
    text: '!text-fuchsia-400',
    focus: '!border-l-fuchsia-400',
  },
  cyan: {
    border: '!border-l-4 !border-l-cyan-500 !border-y-0 !border-r-0',
    text: '!text-cyan-400',
    focus: '!border-l-cyan-400',
  },
  lime: {
    border: '!border-l-4 !border-l-lime-500 !border-y-0 !border-r-0',
    text: '!text-lime-400',
    focus: '!border-l-lime-400',
  },
  default: {
    border: '!border !border-neutral-700',
    text: '!text-neutral-100',
    focus: '!border-blue-500',
  },
}

export const lightAccentStyles: AccentStyles = {
  amber: {
    border: '!border-l-4 !border-l-amber-500 !border-y !border-r !border-y-gray-300 !border-r-gray-300',
    text: '!text-amber-600',
    focus: '!border-l-amber-600',
  },
  fuchsia: {
    border: '!border-l-4 !border-l-fuchsia-500 !border-y !border-r !border-y-gray-300 !border-r-gray-300',
    text: '!text-fuchsia-600',
    focus: '!border-l-fuchsia-600',
  },
  cyan: {
    border: '!border-l-4 !border-l-cyan-500 !border-y !border-r !border-y-gray-300 !border-r-gray-300',
    text: '!text-cyan-600',
    focus: '!border-l-cyan-600',
  },
  lime: {
    border: '!border-l-4 !border-l-lime-500 !border-y !border-r !border-y-gray-300 !border-r-gray-300',
    text: '!text-lime-600',
    focus: '!border-l-lime-600',
  },
  default: {
    border: '!border !border-gray-300',
    text: '!text-gray-900',
    focus: '!border-blue-500',
  },
}

export function getAccentStyles(isDark: boolean, accent: AccentColor) {
  return isDark ? darkAccentStyles[accent] : lightAccentStyles[accent]
}
