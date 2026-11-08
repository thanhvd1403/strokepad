import { PINYIN_SYLLABLES } from './pinyin-syllables'

const SEPARATORS = /['’\s-]+/

// Accented vowels and syllabic consonants, mapped to their plain form and
// tone number. `ü` itself (no tone) is handled separately as `v`.
const TONE_MARKS: Record<string, { base: string; tone: number }> = {
  ā: { base: 'a', tone: 1 },
  á: { base: 'a', tone: 2 },
  ǎ: { base: 'a', tone: 3 },
  à: { base: 'a', tone: 4 },
  ē: { base: 'e', tone: 1 },
  é: { base: 'e', tone: 2 },
  ě: { base: 'e', tone: 3 },
  è: { base: 'e', tone: 4 },
  ī: { base: 'i', tone: 1 },
  í: { base: 'i', tone: 2 },
  ǐ: { base: 'i', tone: 3 },
  ì: { base: 'i', tone: 4 },
  ō: { base: 'o', tone: 1 },
  ó: { base: 'o', tone: 2 },
  ǒ: { base: 'o', tone: 3 },
  ò: { base: 'o', tone: 4 },
  ū: { base: 'u', tone: 1 },
  ú: { base: 'u', tone: 2 },
  ǔ: { base: 'u', tone: 3 },
  ù: { base: 'u', tone: 4 },
  ǖ: { base: 'v', tone: 1 },
  ǘ: { base: 'v', tone: 2 },
  ǚ: { base: 'v', tone: 3 },
  ǜ: { base: 'v', tone: 4 },
  ń: { base: 'n', tone: 2 },
  ň: { base: 'n', tone: 3 },
  ǹ: { base: 'n', tone: 4 },
  ḿ: { base: 'm', tone: 2 },
}

/** Lowercase, fold ü/u: to v, and drop tones, digits, and punctuation. */
export function normalizePinyinInput(value: string) {
  return value
    .toLowerCase()
    .replace(/u:/g, 'v')
    .replace(/[üǖǘǚǜ]/g, 'v')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
}

/**
 * Split joined pinyin into syllables, preferring the split with the fewest
 * syllables (the longest valid syllables). Returns null when the input cannot
 * be covered by standard pinyin syllables.
 */
function splitJoined(input: string): string[] | null {
  if (!input) return null

  const total = input.length
  const best: ({ count: number; split: string[] } | null)[] = Array(total + 1).fill(null)
  best[0] = { count: 0, split: [] }

  for (let index = 0; index < total; index++) {
    const current = best[index]
    if (!current) continue

    for (let length = Math.min(6, total - index); length >= 1; length--) {
      const syllable = input.slice(index, index + length)
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

/**
 * Split a pinyin query into syllables, honouring spaces and apostrophes as
 * hard syllable boundaries. Returns null when any segment is not valid pinyin.
 */
export function splitPinyin(input: string): string[] | null {
  const segments = input
    .toLowerCase()
    .replace(/u:/g, 'v')
    .split(SEPARATORS)
    .filter(Boolean)
  if (!segments.length) return null

  const result: string[] = []
  for (const segment of segments) {
    const normalized = normalizePinyinInput(segment)
    if (!normalized) return null
    const split = splitJoined(normalized)
    if (!split) return null
    result.push(...split)
  }
  return result
}

function convertPiece(piece: string, fillNeutral: boolean): string {
  const explicit = piece.match(/^(.*?)([0-5])$/)
  const body = explicit ? explicit[1] : piece
  const explicitTone = explicit ? Number(explicit[2]) || 5 : 0

  let flat = ''
  const marks: { index: number; tone: number }[] = []
  for (const char of body) {
    if (char === 'ü') {
      flat += 'v'
      continue
    }
    const mark = TONE_MARKS[char]
    if (mark) {
      marks.push({ index: flat.length, tone: mark.tone })
      flat += mark.base
      continue
    }
    if (char >= 'a' && char <= 'z') flat += char
  }

  if (!flat) return ''

  const syllables = splitJoined(flat) ?? [flat]
  const tones = new Array<number>(syllables.length).fill(0)
  let start = 0
  for (let index = 0; index < syllables.length; index++) {
    const end = start + syllables[index].length
    for (const mark of marks) {
      if (mark.index >= start && mark.index < end) tones[index] = mark.tone
    }
    start = end
  }
  if (explicitTone) tones[tones.length - 1] = explicitTone

  return syllables
    .map((syllable, index) => {
      const tone = tones[index] || (fillNeutral ? 5 : 0)
      return `${syllable}${tone || ''}`
    })
    .join('')
}

function convertAlternative(input: string, fillNeutral: boolean): string {
  const pieces = input
    .replace(/([0-5])/g, '$1 ')
    .split(SEPARATORS)
    .filter(Boolean)
  if (!pieces.length) return ''

  const result: string[] = []
  for (const piece of pieces) {
    const converted = convertPiece(piece, fillNeutral)
    if (!converted) return ''
    result.push(converted)
  }
  return result.join('')
}

/**
 * Convert pinyin with tone marks or tone numbers into compact numbered pinyin:
 * `nǐ hǎo` / `ni3hao3` -> `ni3hao3`.
 *
 * With `fillNeutral`, unmarked syllables are written with tone 5 (used for the
 * dictionary data). Without it, unmarked syllables stay unspecified (used for
 * queries). A slash-separated reading is kept as `a|b`.
 */
export function toNumberedPinyin(
  input: string,
  options: { fillNeutral?: boolean } = {},
): string {
  const fillNeutral = options.fillNeutral ?? false
  return input
    .toLowerCase()
    .replace(/u:/g, 'v')
    .split(/[/|]/)
    .map((alternative) => convertAlternative(alternative, fillNeutral))
    .filter(Boolean)
    .join('|')
}
