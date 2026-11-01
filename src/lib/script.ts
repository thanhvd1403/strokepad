import type { Entry, Script } from '../types'

export function entryText(entry: Entry, script: Script) {
  return script === 'traditional' ? entry.trad || entry.simp : entry.simp
}

export function entryStrokes(entry: Entry, script: Script) {
  return script === 'traditional' ? entry.tradStrokes || entry.strokes : entry.strokes
}

export interface ScriptMaps {
  charToTrad: Map<string, string>
  charToSimp: Map<string, string>
  wordToTrad: Map<string, string>
  wordToSimp: Map<string, string>
  maxWordLength: number
}

const mapCache = new WeakMap<Entry[], ScriptMaps>()

export function getScriptMaps(entries: Entry[]): ScriptMaps {
  const cached = mapCache.get(entries)
  if (cached) return cached

  const maps: ScriptMaps = {
    charToTrad: new Map(),
    charToSimp: new Map(),
    wordToTrad: new Map(),
    wordToSimp: new Map(),
    maxWordLength: 1,
  }

  for (const entry of entries) {
    const { simp, trad } = entry
    if (!simp || !trad || simp === trad) continue

    if (entry.type === 'char') {
      if ([...simp].length !== 1 || [...trad].length !== 1) continue
      if (!maps.charToTrad.has(simp)) maps.charToTrad.set(simp, trad)
      if (!maps.charToSimp.has(trad)) maps.charToSimp.set(trad, simp)
    } else {
      if (!maps.wordToTrad.has(simp)) maps.wordToTrad.set(simp, trad)
      if (!maps.wordToSimp.has(trad)) maps.wordToSimp.set(trad, simp)
      maps.maxWordLength = Math.max(maps.maxWordLength, [...simp].length)
    }
  }

  mapCache.set(entries, maps)
  return maps
}

/**
 * Convert text between simplified and traditional Chinese.
 *
 * Known words are matched longest-first, so a sentence like 我的头发 becomes
 * 我的頭髮 rather than the character-by-character 我的頭發. Unknown characters
 * fall back to the single-character map, then stay unchanged.
 */
export function convertText(text: string, script: Script, maps: ScriptMaps): string {
  if (!text) return text

  const wordMap = script === 'traditional' ? maps.wordToTrad : maps.wordToSimp
  const charMap = script === 'traditional' ? maps.charToTrad : maps.charToSimp
  const chars = [...text]
  let out = ''

  for (let index = 0; index < chars.length; ) {
    let matched = false
    const maxLength = Math.min(maps.maxWordLength, chars.length - index)

    for (let length = maxLength; length >= 2; length--) {
      const chunk = chars.slice(index, index + length).join('')
      const mapped = wordMap.get(chunk)
      if (mapped) {
        out += mapped
        index += length
        matched = true
        break
      }
    }

    if (matched) continue

    const char = chars[index]
    out += charMap.get(char) ?? char
    index++
  }

  return out
}

export function toScript(text: string, script: Script, entries: Entry[]): string {
  if (!text || !entries.length) return text
  return convertText(text, script, getScriptMaps(entries))
}
