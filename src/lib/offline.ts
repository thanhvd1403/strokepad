// Keep these cache names in sync with vite.config.ts.
export const DICTIONARY_CACHE = 'hanzi-dictionary'
export const STROKE_CACHE = 'hanzi-strokes'
export const STROKE_INDEX_CACHE = 'hanzi-stroke-index'
export const STROKE_INDEX_URL = '/data/stroke-available.json'

export function strokeDataUrl(char: string) {
  return `/data/strokes/${encodeURIComponent(char)}.json`
}

export async function countCachedStrokes(): Promise<number> {
  if (typeof caches === 'undefined') return 0
  const cache = await caches.open(STROKE_CACHE)
  const keys = await cache.keys()
  const chars = new Set<string>()

  for (const request of keys) {
    const match = new URL(request.url).pathname.match(/\/data\/strokes\/(.+)\.json$/)
    if (match) chars.add(decodeURIComponent(match[1]))
  }

  return chars.size
}
