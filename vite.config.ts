import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Show a build date and commit in Settings instead of the package version.
// Cloudflare Pages exposes the commit SHA; fall back to the local git history.
function buildStamp() {
  let commit = process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA ?? ''
  if (!commit) {
    try {
      commit = execSync('git rev-parse HEAD', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
    } catch {
      commit = ''
    }
  }
  const date = new Date().toISOString().slice(0, 10)
  return `${date} (${commit ? commit.slice(0, 8) : 'dev'})`
}

export default defineConfig({
  define: {
    __BUILD_STAMP__: JSON.stringify(buildStamp()),
  },
  server: {
    watch: {
      // The pinyin DAG dictionaries are generated and very large; watching
      // them can hit Windows file-lock errors.
      ignored: ['**/public/data/pinyin/**'],
    },
  },
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
            // Pinyin sentence suggestions, loaded on demand.
            urlPattern: /\/data\/pinyin\/.*\.json(\?.*)?$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hanzi-pinyin-dict',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
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
