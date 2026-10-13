import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      // One look for the whole app (colours from the Tonight/Recipe/Week mockups).
      // Values live as CSS variables in app/globals.css; change them there.
      colors: {
        ground: 'var(--color-ground)',
        surface: 'var(--color-surface)',
        sunken: 'var(--color-sunken)',
        line: 'var(--color-line)',
        ink: { DEFAULT: 'var(--color-ink)', soft: 'var(--color-ink-soft)' },
        primary: {
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primary-dark)',
          soft: 'var(--color-primary-soft)',
        },
        accent: { DEFAULT: 'var(--color-accent)', soft: 'var(--color-accent-soft)' },
        danger: {
          DEFAULT: 'var(--color-danger)',
          dark: 'var(--color-danger-dark)',
          soft: 'var(--color-danger-soft)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
        panel: '22px',
      },
      spacing: {
        tabbar: 'var(--tabbar-height)',
      },
    },
  },
  plugins: [],
}
export default config
