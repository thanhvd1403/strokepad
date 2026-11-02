import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Strokepad',
        short_name: 'Strokepad',
        description:
          'A calm, offline-first trainer for writing Chinese characters. Search by character or pinyin, practice stroke by stroke, and save your favorites.',
        theme_color: '#fbf6ec',
        background_color: '#fbf6ec',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Keep cache names in sync with src/lib/offline.ts.
        runtimeCaching: [
          {
            // The app fetches this with ?v=<DATA_VERSION>. CacheFirst keeps the
            // 3.7 MB dictionary from being downloaded again on every launch.
            urlPattern: /\/data\/entries\.json(\?.*)?$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hanzi-dictionary',
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/data\/stroke-available\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'hanzi-stroke-index',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\/data\/strokes\/.*\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hanzi-strokes',
              expiration: { maxEntries: 5000, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/hanzi-writer-data@.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hanzi-strokes-cdn',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})
