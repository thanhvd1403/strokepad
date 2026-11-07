import { containsHan, normalizePinyinInput } from './search'
import { PINYIN_SYLLABLES } from './pinyin-syllables'
import type { Entry } from '../types'

interface DictionaryIndex {
  chars: Map<string, Entry[]>
  words: Map<string, Entry[]>
}

const indexCache = new WeakMap<Entry[], DictionaryIndex>()
const HAN_ONLY = /^[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+$/

function buildIndex(entries: Entry[]): DictionaryIndex {
  const cached = indexCache.get(entries)
  if (cached) return cached

  const chars = new Map<string, Entry[]>()
  const words = new Map<string, Entry[]>()

  for (const entry of entries) {
    const key = entry.pinyinFlat
    if (!key) continue
    const target = entry.type === 'char' ? chars : words
    const list = target.get(key)
    if (list) list.push(entry)
    else target.set(key, [entry])
  }

  for (const list of chars.values()) {
    list.sort((a, b) => a.freq - b.freq)
  }
  for (const list of words.values()) {
    list.sort((a, b) => a.freq - b.freq)
  }

  const index = { chars, words }
  indexCache.set(entries, index)
  return index
}

/**
 * Split joined pinyin into syllables, preferring the split with the fewest
 * syllables (the longest valid syllables). Returns null when the input cannot
 * be covered by standard pinyin syllables.
 */
function splitPinyin(input: string): string[] | null {
  const normalized = normalizePinyinInput(input)
  if (normalized.length < 2) return null

  const total = normalized.length
  const best: ({ count: number; split: string[] } | null)[] = Array(total + 1).fill(null)
  best[0] = { count: 0, split: [] }

  for (let index = 0; index < total; index++) {
    const current = best[index]
    if (!current) continue

    for (let length = Math.min(6, total - index); length >= 1; length--) {
      const syllable = normalized.slice(index, index + length)
      if (!PINYIN_SYLLABLES.has(syllable)) continue

      const nextIndex = index + length
      const candidate = {
        count: current.count + 1,
        split: [...current.split, syllable],
      }
      const next = best[nextIndex]
      if (!next || candidate.count < next.count) {
        best[nextIndex] = candidate
      }
    }
  }

  return best[total]?.split ?? null
}

/** True when the input looks like pinyin rather than English or Chinese. */
export function isPinyinQuery(input: string) {
  if (containsHan(input)) return false
  return splitPinyin(input) !== null
}

/**
 * Build the best Chinese sentence candidates from the dictionary already
 * loaded in the app. This does not download or cache whole sentences; only the
 * character/word index is kept in memory.
 */
export async function suggestPinyin(
  input: string,
  entries?: Entry[],
): Promise<string[]> {
  const split = splitPinyin(input)
  if (!split || !entries?.length) return []

  const index = buildIndex(entries)
  const total = split.length
  const beam = 24
  const wordBonus = 2

  const paths: { score: number; text: string }[][] = Array.from(
    { length: total + 1 },
    () => [],
  )
  paths[0] = [{ score: 0, text: '' }]

  for (let start = 0; start < total; start++) {
    if (!paths[start].length) continue

    for (let end = start + 1; end <= total; end++) {
      const key = split.slice(start, end).join('')
      const words = index.words.get(key)
      const chars = end === start + 1 ? index.chars.get(key) : undefined
      if (!words && !chars) continue

      const candidates: Entry[] = []
      if (words) candidates.push(...words.slice(0, 4))
      if (chars) candidates.push(...chars.slice(0, 3))

      for (const previous of paths[start]) {
        for (const entry of candidates) {
          paths[end].push({
            score:
              previous.score -
              Math.log(1 + Math.max(0, entry.freq)) +
              wordBonus * (entry.simp.length - 1),
            text: previous.text + entry.simp,
          })
        }
      }

      if (paths[end].length > beam * 4) {
        const best = new Map<string, { score: number; text: string }>()
        for (const path of paths[end]) {
          const existing = best.get(path.text)
          if (!existing || path.score > existing.score) {
            best.set(path.text, path)
          }
        }
        paths[end] = [...best.values()]
          .sort((a, b) => b.score - a.score)
          .slice(0, beam)
      }
    }
  }

  const best = new Map<string, { score: number; text: string }>()
  for (const path of paths[total]) {
    if (!HAN_ONLY.test(path.text)) continue
    const existing = best.get(path.text)
    if (!existing || path.score > existing.score) {
      best.set(path.text, path)
    }
  }

  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((path) => path.text)
}
