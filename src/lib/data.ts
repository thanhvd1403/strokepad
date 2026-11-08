import type { EntryData } from '../types'

// Bump this when public/data/entries.json changes. The service worker caches
// the dictionary by URL, so a new version is fetched once and then reused.
export const DATA_VERSION = 3
export const ENTRIES_URL = `/data/entries.json?v=${DATA_VERSION}`

let cache: Promise<EntryData> | null = null

export function loadEntries(): Promise<EntryData> {
  if (!cache) {
    cache = fetch(ENTRIES_URL)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Dictionary request failed: ${response.status}`)
        return (await response.json()) as EntryData
      })
      .catch((error) => {
        cache = null
        throw error
      })
  }
  return cache
}
