import type { MetadataRoute } from 'next'

/**
 * Web app manifest, served at /manifest.webmanifest.
 *
 * This is what makes Spark installable ("Add to Home Screen"). On iPhone it
 * is not optional for calls: iOS only delivers Web Push to sites installed
 * to the Home Screen (iOS 16.4+), so without this an iPhone can never ring
 * while Spark is closed.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Spark',
    short_name: 'Spark',
    description: 'Swipe, match, chat and call.',
    start_url: '/discover',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#e45a84',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
