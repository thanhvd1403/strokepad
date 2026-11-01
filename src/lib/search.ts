import type { Entry } from '../types'

const HAN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

export function isHan(char: string) {
  return HAN.test(char)
}

export function containsHan(value: string) {
  return HAN.test(value)
}

export function normalizePinyinInput(value: string) {
  return value
    .toLowerCase()
    .replace(/[üǖǘǚǜ]/g, 'v')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
}

export function normalizeChineseInput(value: string) {
  return value.trim().replace(/\s+/g, '')
}

export interface RankedEntry extends Entry {
  score: number
}

function scoreEntry(entry: Entry, query: string, hanQuery: boolean) {
  let base = 0

  if (hanQuery) {
    const q = normalizeChineseInput(query)
    if (!q) return -1
    if (entry.simp === q || entry.trad === q) base = 1200
    else if (entry.simp.startsWith(q) || entry.trad.startsWith(q)) base = 700
    else if (entry.simp.includes(q) || entry.trad.includes(q)) base = 320
    else return -1
  } else {
    const q = normalizePinyinInput(query)
    if (!q) return -1
    const flat = entry.pinyinFlat
    const alt = flat.replaceAll('v', 'u')
    const initials = entry.initials

    if (flat === q || alt === q) base = 1100
    else if (flat.startsWith(q) || alt.startsWith(q)) base = 700
    else if (initials === q) base = 620
    else if (initials.startsWith(q)) base = 470
    else if (flat.includes(q) || alt.includes(q)) base = 260
    else return -1
  }

  const hskBoost = entry.hsk === 0 ? 20 : (8 - entry.hsk) * 28
  const freqBoost = 140 / (1 + entry.freq / 1500)
  const lengthPenalty = (entry.simp.length - 1) * 5
  const typeBonus = hanQuery && query.trim().length === 1 && entry.type === 'char' ? 30 : 0

  return base + hskBoost + freqBoost - lengthPenalty + typeBonus
}

export function searchEntries(
  entries: Entry[],
  query: string,
  hskLevels: number[],
  limit = 80,
): RankedEntry[] {
  const trimmed = query.trim()
  if (!trimmed) return []
  const hanQuery = containsHan(trimmed)
  const results: RankedEntry[] = []

  for (const entry of entries) {
    if (hskLevels.length > 0 && !hskLevels.includes(entry.hsk)) continue
    const score = scoreEntry(entry, trimmed, hanQuery)
    if (score > 0) results.push({ ...entry, score })
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.freq !== b.freq) return a.freq - b.freq
    return a.simp.length - b.simp.length
  })

  return results.slice(0, limit)
}

export function findEntry(entries: Entry[], text: string): Entry | undefined {
  const matches = (entry: Entry) => entry.simp === text || entry.trad === text
  if ([...text].length === 1) {
    return (
      entries.find((e) => e.type === 'char' && matches(e)) ?? entries.find(matches)
    )
  }
  return (
    entries.find((e) => e.type === 'word' && matches(e)) ?? entries.find(matches)
  )
}

export function starterEntries(entries: Entry[], limit = 24) {
  return entries
    .filter((e) => e.type === 'char' && e.hsk === 1)
    .sort((a, b) => a.freq - b.freq)
    .slice(0, limit)
}

export function randomStarter(entries: Entry[]) {
  const starters = starterEntries(entries, 80)
  if (!starters.length) return undefined
  return starters[Math.floor(Math.random() * starters.length)]
}

export function splitHanCharacters(text: string) {
  return [...text].filter((char) => isHan(char))
}

export function practiceCharacters(text: string) {
  const chars = splitHanCharacters(text)
  return chars.length ? chars : [...text].filter((c) => c.trim())
}
