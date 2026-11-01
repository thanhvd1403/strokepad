import type { EntryData } from '../types'

let cache: Promise<EntryData> | null = null

export function loadEntries(): Promise<EntryData> {
  if (!cache) {
    cache = fetch('/data/entries.json')
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
