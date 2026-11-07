import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import zlib from 'node:zlib'
import { parse } from 'csv-parse/sync'
import { pinyin } from 'pinyin-pro'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'data', 'sources')
const OUT = path.join(ROOT, 'public', 'data')
const STROKE_SRC = path.join(ROOT, 'node_modules', 'hanzi-writer-data')
const STROKE_OUT = path.join(OUT, 'strokes')

for (const file of [
  'cedict.txt.gz',
  'CVDICT.u8',
  'hsk30.csv',
  'hsk30-chars.csv',
  'zh_cn_50k.txt',
]) {
  if (!fs.existsSync(path.join(SRC, file))) {
    console.error(`Missing data/sources/${file}. Run \`npm run data:fetch\` first.`)
    process.exit(1)
  }
}

fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(STROKE_OUT, { recursive: true })
fs.mkdirSync(path.join(ROOT, 'public', 'licenses'), { recursive: true })

const HAN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/
const isHan = (ch) => HAN.test(ch)

function tradVariants(value) {
  return String(value ?? '')
    .split(/[/|]/)
    .map((variant) => variant.trim())
    .filter(Boolean)
}

function hasStrokeForChar(ch) {
  return fs.existsSync(path.join(STROKE_SRC, `${ch}.json`))
}

function hasStrokeForAll(value) {
  return [...value].filter(isHan).every(hasStrokeForChar)
}

// HSK's traditional column sometimes lists variants ("裡/裏/里"). Prefer the
// first variant that we can actually draw, so practice never hits missing data.
function pickTrad(value, fallback) {
  const variants = tradVariants(value)
  if (!variants.length) return fallback
  return variants.find(hasStrokeForAll) ?? variants[0]
}

function toFlat(value) {
  return String(value)
    .replace(/u:/g, 'v')
    .replace(/[üǖǘǚǜ]/g, 'v')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase()
}

function toInitials(value) {
  return pinyin(value, { type: 'array', pattern: 'first' })
    .map((part) => toFlat(part)[0] ?? '')
    .join('')
}

function displayPinyin(value) {
  return pinyin(value, { type: 'array' }).join(' ')
}

function cleanDefs(defs, limit = 4) {
  const seen = new Set()
  const out = []
  for (const raw of defs) {
    let d = raw.trim()
    if (!d) continue
    // Drop pure cross-reference noise and very long encyclopedic notes.
    if (/^variant of |^old variant of |^see |^abbr\. for /i.test(d) && d.length < 12) continue
    if (/^(CL|LT):/i.test(d)) continue
    d = d.replace(/\s+/g, ' ')
    if (d.length > 180) d = d.slice(0, 177).trimEnd() + '…'
    if (seen.has(d)) continue
    seen.add(d)
    out.push(d)
    if (out.length >= limit) break
  }
  return out
}

function parseCedictFile(file, { gzip = false } = {}) {
  const raw = gzip
    ? zlib.gunzipSync(fs.readFileSync(file)).toString('utf8')
    : fs.readFileSync(file, 'utf8')
  const bySimpPinyin = new Map()
  const bySimpPinyinNum = new Map()
  const bySimp = new Map()
  let count = 0
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || line.startsWith('%')) continue
    const m = line.match(/^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.*)\/$/)
    if (!m) continue
    const [, trad, simp, py, defsRaw] = m
    const flat = toFlat(py)
    const defs = defsRaw.split('/').filter(Boolean)
    if (!defs.length) continue
    const key = `${simp}|${flat}`
    if (!bySimpPinyin.has(key)) bySimpPinyin.set(key, defs)
    const numKey = `${simp}|${py.replace(/\s+/g, '')}`
    if (!bySimpPinyinNum.has(numKey)) bySimpPinyinNum.set(numKey, defs)
    if (!bySimp.has(simp)) bySimp.set(simp, { trad, pinyin: py, defs })
    count++
  }
  return { bySimpPinyin, bySimpPinyinNum, bySimp, count }
}

function parseReference(ref) {
  if (!ref) return null
  const m = ref.match(/^(.+?)\|(.+?)\[([^\]]+)\]$/)
  if (!m) return null
  return {
    trad: m[1],
    simp: m[2],
    flat: toFlat(m[3]),
    num: m[3].replace(/\s+/g, ''),
  }
}

function lookup(dict, simp, flat, ref) {
  if (ref?.num) {
    const exactNum = dict.bySimpPinyinNum.get(`${ref.simp}|${ref.num}`)
    if (exactNum) return exactNum
  }
  const exact = dict.bySimpPinyin.get(`${simp}|${flat}`)
  if (exact) return exact
  if (ref) {
    const r = dict.bySimpPinyin.get(`${ref.simp}|${ref.flat}`)
    if (r) return r
  }
  const fallback = dict.bySimp.get(simp)
  return fallback?.defs ?? []
}

console.log('Parsing dictionaries…')
const en = parseCedictFile(path.join(SRC, 'cedict.txt.gz'), { gzip: true })
const vi = parseCedictFile(path.join(SRC, 'CVDICT.u8'))
console.log(`  CC-CEDICT: ${en.count} entries`)
console.log(`  CVDICT:    ${vi.count} entries`)

console.log('Parsing HSK 3.0 lists…')
const wordRows = parse(fs.readFileSync(path.join(SRC, 'hsk30.csv'), 'utf8'), {
  columns: true,
  skip_empty_lines: true,
})
const charRows = parse(fs.readFileSync(path.join(SRC, 'hsk30-chars.csv'), 'utf8'), {
  columns: true,
  skip_empty_lines: true,
})

const levelOf = (value) => (String(value).trim() === '7-9' ? 7 : Number(value) || 7)
const charLevelMap = new Map(charRows.map((row) => [row.Hanzi, levelOf(row.Level)]))

// Prefer the HSK word-list reading for single characters. It reflects the
// reading learners meet first (了 le, 地 de, 得 de, 行 xíng, ...), while
// pinyin-pro alone can pick a less common standalone reading.
const singleCharWords = new Map()
for (const row of wordRows) {
  const simp = row.Simplified.trim()
  if (simp.length !== 1) continue
  const level = levelOf(row.Level)
  const existing = singleCharWords.get(simp)
  if (!existing || level < existing.level) {
    singleCharWords.set(simp, {
      pinyin: row.Pinyin.trim(),
      level,
      trad: row.Traditional?.trim(),
      ref: parseReference(row.CEDICT),
    })
  }
}

const freqLines = fs.readFileSync(path.join(SRC, 'zh_cn_50k.txt'), 'utf8').split('\n')
const freqMap = new Map()
freqLines.forEach((line, i) => {
  const [word] = line.trim().split(/\s+/)
  if (word && !freqMap.has(word)) freqMap.set(word, i + 1)
})

console.log('Loading stroke data…')
const strokeCounts = new Map()
const availableStrokes = new Set()
for (const row of charRows) {
  const ch = row.Hanzi
  const src = path.join(STROKE_SRC, `${ch}.json`)
  if (!fs.existsSync(src)) continue
  const data = JSON.parse(fs.readFileSync(src, 'utf8'))
  const dest = path.join(STROKE_OUT, `${ch}.json`)
  fs.writeFileSync(dest, JSON.stringify(data))
  strokeCounts.set(ch, data.medians.length)
  availableStrokes.add(ch)
}

// Include any Han characters that appear in HSK words but are not in the 3,000-char list.
for (const row of wordRows) {
  for (const ch of row.Simplified) {
    if (!isHan(ch) || availableStrokes.has(ch)) continue
    const src = path.join(STROKE_SRC, `${ch}.json`)
    if (!fs.existsSync(src)) continue
    const data = JSON.parse(fs.readFileSync(src, 'utf8'))
    fs.writeFileSync(path.join(STROKE_OUT, `${ch}.json`), JSON.stringify(data))
    strokeCounts.set(ch, data.medians.length)
    availableStrokes.add(ch)
  }
}
console.log(`  ${availableStrokes.size} characters with stroke data`)

function ensureStroke(ch) {
  if (strokeCounts.has(ch)) return strokeCounts.get(ch)
  const src = path.join(STROKE_SRC, `${ch}.json`)
  if (!fs.existsSync(src)) return null
  const data = JSON.parse(fs.readFileSync(src, 'utf8'))
  fs.writeFileSync(path.join(STROKE_OUT, `${ch}.json`), JSON.stringify(data))
  strokeCounts.set(ch, data.medians.length)
  availableStrokes.add(ch)
  return data.medians.length
}

console.log('Building entries…')
const entries = []
const seen = new Set()

// Characters
for (const row of charRows) {
  const ch = row.Hanzi
  if (!isHan(ch)) continue
  const wordForm = singleCharWords.get(ch)
  const display = wordForm?.pinyin || displayPinyin(ch)
  const flat = toFlat(wordForm?.pinyin ?? pinyin(ch, { toneType: 'none' }))
  const id = `c:${ch}`
  if (seen.has(id)) continue
  seen.add(id)
  const enDefs = lookup(en, ch, flat, wordForm?.ref ?? null)
  const viDefs = lookup(vi, ch, flat, wordForm?.ref ?? null)
  entries.push({
    id,
    type: 'char',
    simp: ch,
    trad: pickTrad(wordForm?.trad ?? row.Traditional, ch),
    pinyin: display,
    pinyinFlat: flat,
    initials: toInitials(ch),
    en: cleanDefs(enDefs),
    vi: cleanDefs(viDefs),
    hsk: levelOf(row.Level),
    freq: freqMap.get(ch) ?? 50000 + entries.length,
    strokes: strokeCounts.get(ch) ?? 0,
  })
}

// Words, deduplicated by simplified + pinyin
const wordGroups = new Map()
for (const row of wordRows) {
  const simp = row.Simplified.trim()
  if (!simp) continue
  const py = row.Pinyin.trim()
  // Keep tone distinctions: 得 dé and 得 de are different words.
  const key = `${simp}|${py.replace(/\s+/g, '')}`
  const group = wordGroups.get(key)
  if (group) {
    group.level = Math.min(group.level, levelOf(row.Level))
    if (row.POS) group.pos.add(row.POS)
    if (row.Traditional) group.trad = group.trad || row.Traditional
    if (row.CEDICT) group.ref = group.ref || parseReference(row.CEDICT)
  } else {
    wordGroups.set(key, {
      simp,
      trad: row.Traditional || simp,
      pinyin: py,
      level: levelOf(row.Level),
      pos: new Set(row.POS ? [row.POS] : []),
      ref: parseReference(row.CEDICT),
    })
  }
}

const charEntryKeys = new Set(entries.map((entry) => `${entry.simp}|${entry.pinyin}`))

for (const group of wordGroups.values()) {
  const { simp, pinyin: py } = group
  const flat = toFlat(py)
  // A one-character word that duplicates the character entry adds no value.
  // Alternate readings (e.g. 行 háng) are kept.
  if (simp.length === 1 && charEntryKeys.has(`${simp}|${py}`)) continue
  const id = `w:${simp}:${py.replace(/\s+/g, '')}`
  if (seen.has(id)) continue
  seen.add(id)
  const enDefs = lookup(en, simp, flat, group.ref)
  const viDefs = lookup(vi, simp, flat, group.ref)
  const chars = [...simp].filter(isHan)
  const strokeTotal = chars.reduce((sum, ch) => sum + (strokeCounts.get(ch) ?? 0), 0)
  entries.push({
    id,
    type: 'word',
    simp,
    trad: pickTrad(group.trad, simp),
    pinyin: py,
    pinyinFlat: flat,
    initials: toInitials(simp),
    en: cleanDefs(enDefs),
    vi: cleanDefs(viDefs),
    hsk: group.level,
    freq: freqMap.get(simp) ?? 50000 + entries.length,
    strokes: strokeTotal,
    pos: [...group.pos].join('/'),
  })
}

// Add common words outside HSK 3.0 (top 5,000 frequency list). This catches
// everyday phrases like 你好 that the official word list treats as phrases.
const existingSimp = new Set(entries.map((e) => e.simp))
let commonAdded = 0
for (const [word, rank] of freqMap) {
  if (rank > 5000 || commonAdded >= 2500) break
  if (word.length < 2 || word.length > 4) continue
  const chars = [...word]
  if (!chars.every(isHan)) continue
  if (existingSimp.has(word)) continue
  const py = displayPinyin(word)
  const flat = toFlat(py)
  const enDefs = en.bySimpPinyin.get(`${word}|${flat}`) ?? en.bySimp.get(word)?.defs
  if (!enDefs?.length) continue
  const viDefs = vi.bySimpPinyin.get(`${word}|${flat}`) ?? vi.bySimp.get(word)?.defs ?? []
  const strokeCountsForWord = chars.map(ensureStroke)
  if (strokeCountsForWord.some((n) => !n)) continue
  const id = `w:${word}:${flat}`
  if (seen.has(id)) continue
  seen.add(id)
  const charLevels = chars.map((ch) => charLevelMap.get(ch)).filter(Boolean)
  const inferredLevel = charLevels.length === chars.length ? Math.min(...charLevels) : 0
  entries.push({
    id,
    type: 'word',
    simp: word,
    trad: pickTrad(en.bySimp.get(word)?.trad ?? word, word),
    pinyin: py,
    pinyinFlat: flat,
    initials: toInitials(word),
    en: cleanDefs(enDefs),
    vi: cleanDefs(viDefs),
    hsk: inferredLevel,
    freq: rank,
    strokes: strokeCountsForWord.reduce((sum, n) => sum + n, 0),
    pos: '',
  })
  existingSimp.add(word)
  commonAdded++
}
console.log(`  + ${commonAdded} common non-HSK words`)

// Resolve rare traditional variants inside words to the drawable character
// form we already chose for the single-character entry. For example 哗然 is
// listed as 譁然, but the character entry uses 嘩 (which has stroke data).
const charTradMap = new Map()
for (const entry of entries) {
  if (entry.type === 'char' && entry.trad && entry.trad !== entry.simp) {
    charTradMap.set(entry.simp, entry.trad)
  }
}

for (const entry of entries) {
  if (entry.type !== 'word') continue
  const simpChars = [...entry.simp]
  const tradChars = [...entry.trad]
  if (simpChars.length !== tradChars.length) continue
  entry.trad = tradChars
    .map((tradChar, index) => {
      if (hasStrokeForChar(tradChar)) return tradChar
      const mapped = charTradMap.get(simpChars[index])
      return mapped && hasStrokeForChar(mapped) ? mapped : tradChar
    })
    .join('')
}

// Traditional forms are often more complex than their simplified counterparts,
// so stroke totals are counted separately. This pass also copies stroke data
// for every traditional character the dictionary can display.
for (const entry of entries) {
  const tradChars = [...entry.trad].filter(isHan)
  const counts = tradChars.map(ensureStroke)
  entry.tradStrokes =
    counts.length > 0 && counts.every((count) => count)
      ? counts.reduce((sum, count) => sum + count, 0)
      : entry.strokes
}

const hskOrder = (hsk) => (hsk === 0 ? 99 : hsk)
entries.sort((a, b) => {
  if (hskOrder(a.hsk) !== hskOrder(b.hsk)) return hskOrder(a.hsk) - hskOrder(b.hsk)
  if (a.freq !== b.freq) return a.freq - b.freq
  return a.simp.length - b.simp.length
})

const payload = {
  version: 2,
  generatedAt: new Date().toISOString(),
  sources: {
    dictionaryEn: 'CC-CEDICT (CC BY-SA 4.0)',
    dictionaryVi: 'CVDICT (CC BY-SA 4.0)',
    hsk: 'HSK 3.0 (2021), via ivankra/hsk30, derived from elkmovie/hsk30 and shawkynasr/HSK-official-Query-System (MIT)',
    frequency: 'FrequencyWords zh_cn_50k (CC BY-SA 4.0, OpenSubtitles 2018)',
    strokes: 'Make Me a Hanzi / hanzi-writer-data (Arphic Public License)',
  },
  entries,
}

fs.writeFileSync(path.join(OUT, 'entries.json'), JSON.stringify(payload))
fs.writeFileSync(path.join(OUT, 'stroke-available.json'), JSON.stringify([...availableStrokes].sort()))

// Copy the Arphic license alongside the data, as required by the license.
const arphic = path.join(STROKE_SRC, 'ARPHICPL.TXT')
if (fs.existsSync(arphic)) {
  fs.copyFileSync(arphic, path.join(ROOT, 'public', 'licenses', 'ARPHICPL.TXT'))
}

const sourceFiles = [
  ['cedict.txt.gz', 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz'],
  ['CVDICT.u8', 'https://github.com/ph0ngp/CVDICT'],
  ['hsk30.csv', 'https://github.com/ivankra/hsk30'],
  ['hsk30-chars.csv', 'https://github.com/ivankra/hsk30'],
  ['zh_cn_50k.txt', 'https://github.com/hermitdave/FrequencyWords'],
]
const manifest = sourceFiles.map(([file, url]) => {
  const buf = fs.readFileSync(path.join(SRC, file))
  return {
    file,
    url,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    bytes: buf.length,
  }
})
fs.writeFileSync(path.join(SRC, 'SOURCE.json'), JSON.stringify(manifest, null, 2))
fs.writeFileSync(path.join(OUT, 'SOURCE.json'), JSON.stringify(manifest, null, 2))

const size = fs.statSync(path.join(OUT, 'entries.json')).size
const chars = entries.filter((e) => e.type === 'char').length
const words = entries.filter((e) => e.type === 'word').length
console.log(`  ${entries.length} entries (${chars} chars, ${words} words)`)
console.log(`  entries.json: ${(size / 1024 / 1024).toFixed(2)} MB`)
console.log(`  missing EN: ${entries.filter((e) => !e.en.length).length}`)
console.log(`  missing VI: ${entries.filter((e) => !e.vi.length).length}`)
console.log('Done.')
