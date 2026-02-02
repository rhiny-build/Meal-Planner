import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      keyframes: {
        slideDown: {
          from: { height: '0', opacity: '0' },
          to: { height: 'var(--radix-collapsible-content-height)', opacity: '1' },
        },
        slideUp: {
          from: { height: 'var(--radix-collapsible-content-height)', opacity: '1' },
          to: { height: '0', opacity: '0' },
        },
      },
      animation: {
        slideDown: 'slideDown 200ms ease-out',
        slideUp: 'slideUp 200ms ease-out',
      },
    },
  },
  plugins: [],
}
export default config
