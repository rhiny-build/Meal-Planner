/**
 * Web app manifest (Next serves it at /manifest.webmanifest).
 * Lets the app be added to the home screen and open full screen, without the
 * browser's address bar. Colours are the app's own (see globals.css).
 */

import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Family Meal Planner',
    short_name: 'Meals',
    description: 'Plan your family meals for the week',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f3f5f2',
    theme_color: '#f3f5f2',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
