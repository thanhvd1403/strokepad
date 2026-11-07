import {
  DirectedAcyclicGraph,
  splitAsYinJie,
  type TDagDict,
} from 'pinyin-input-method-engine'
import type { Entry } from '../types'
import { containsHan, normalizePinyinInput } from './search'
import { PINYIN_SYLLABLES } from './pinyin-syllables'

// Bump when the copied dictionaries change so clients fetch the new files.
const PINYIN_DATA_VERSION = 1
const DICT_URLS = {
  char: `/data/pinyin/dag_char.json?v=${PINYIN_DATA_VERSION}`,
  phrase: `/data/pinyin/dag_phrase.json?v=${PINYIN_DATA_VERSION}`,
}
const HAN_ONLY = /^[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+$/

let enginePromise: Promise<DirectedAcyclicGraph> | null = null
const dictionaryBuffers = new Map<string, Promise<ArrayBuffer>>()
const charRankCache = new WeakMap<Entry[], Map<string, number>>()

// The engine's phrase data sometimes prefers a rare word (for example 爱昵)
// over the more common character-by-character reading (我爱你). A very light
// character-frequency prior from the app dictionary breaks those near-ties.
const RANK_WEIGHT = 0.02
const MISSING_RANK = 20000

function getCharRanks(entries?: Entry[]) {
  if (!entries?.length) return null
  const cached = charRankCache.get(entries)
  if (cached) return cached

  const ranks = new Map<string, number>()
  for (const entry of entries) {
    if (entry.type === 'char' && !ranks.has(entry.simp)) {
      ranks.set(entry.simp, entry.freq)
    }
  }
  charRankCache.set(entries, ranks)
  return ranks
}

function rankPenalty(text: string, ranks: Map<string, number>) {
  let sum = 0
  for (const char of text) {
    sum += Math.log(1 + (ranks.get(char) ?? MISSING_RANK))
  }
  return sum
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

async function fetchDictionary(url: string): Promise<ArrayBuffer> {
  const existing = dictionaryBuffers.get(url)
  if (existing) return existing

  const promise = fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load pinyin dictionary: ${response.status}`)
    }
    return response.arrayBuffer()
  })
  promise.catch(() => dictionaryBuffers.delete(url))
  dictionaryBuffers.set(url, promise)
  return promise
}

async function loadDictionary(url: string): Promise<TDagDict> {
  const buffer = await fetchDictionary(url)
  // Release the raw bytes once the model has been parsed.
  dictionaryBuffers.delete(url)
  return JSON.parse(new TextDecoder().decode(buffer)) as TDagDict
}

/**
 * Lazily load the MIT pinyin-input-method-engine DAG model. The two JSON files
 * are about 21 MB uncompressed (~2.5 MB Brotli). They are warmed in the
 * background after the app shell loads, or fetched on first use.
 */
export function loadPinyinEngine() {
  if (!enginePromise) {
    enginePromise = Promise.all([
      loadDictionary(DICT_URLS.char),
      loadDictionary(DICT_URLS.phrase),
    ])
      .then(([charDict, phraseDict]) => new DirectedAcyclicGraph(charDict, phraseDict))
      .catch((error: unknown) => {
        enginePromise = null
        throw error
      })
  }
  return enginePromise
}

/**
 * Warm the HTTP/service-worker cache after the app shell has loaded. The JSON
 * is not parsed here, so this does not block the UI or build the model.
 */
export function prefetchPinyinDictionaries() {
  if (typeof navigator !== 'undefined') {
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string }
      }
    ).connection
    if (
      connection?.saveData ||
      connection?.effectiveType === 'slow-2g' ||
      connection?.effectiveType === '2g'
    ) {
      return
    }
  }

  for (const url of Object.values(DICT_URLS)) {
    void fetchDictionary(url).catch(() => null)
  }
}

/** Drop the loaded model so the next suggestion rebuilds it. */
export function resetPinyinSuggestions() {
  enginePromise = null
  dictionaryBuffers.clear()
}

/**
 * Generate Chinese sentence candidates with the DAG language model from
 * pinyin-input-method-engine (a TypeScript port of Pinyin2Hanzi).
 */
export async function suggestPinyin(
  input: string,
  entries?: Entry[],
): Promise<string[]> {
  const normalized = normalizePinyinInput(input)
  if (!normalized) return []

  const splits = splitAsYinJie(normalized)
  const yinJieList = splits[0]
  if (!yinJieList?.length) return []

  const engine = await loadPinyinEngine()
  const paths = engine.query({ yinJieList, maxNum: 10, log: true })
  const ranks = getCharRanks(entries)

  const scored = paths
    .map((path) => {
      const text = path.phraseInfoList.map((info) => info.phrase).join('')
      return {
        text,
        score:
          path.score - (ranks ? RANK_WEIGHT * rankPenalty(text, ranks) : 0),
      }
    })
    .sort((a, b) => b.score - a.score)

  const seen = new Set<string>()
  const results: string[] = []
  for (const { text } of scored) {
    if (!text || seen.has(text) || !HAN_ONLY.test(text)) continue
    seen.add(text)
    results.push(text)
    if (results.length >= 5) break
  }
  return results
}
