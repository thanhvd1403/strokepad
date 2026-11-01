export type EntryType = 'char' | 'word'

export interface Entry {
  id: string
  type: EntryType
  simp: string
  trad: string
  pinyin: string
  pinyinFlat: string
  initials: string
  en: string[]
  vi: string[]
  hsk: number
  freq: number
  strokes: number
  tradStrokes: number
  pos?: string
}

export interface EntryData {
  version: number
  generatedAt: string
  sources: Record<string, string>
  entries: Entry[]
}

export type FavoriteType = 'char' | 'word' | 'sentence'

export interface Favorite {
  id?: number
  type: FavoriteType
  text: string
  pinyin?: string
  meaning?: string
  createdAt: number
}

export type PracticeMode = 'guided' | 'plain'
export type GridStyle = 'rice' | 'field' | 'none'
export type Script = 'simplified' | 'traditional'
export type Language = 'en' | 'vi'
export type Theme = 'light' | 'dark' | 'system'

export interface StrokeData {
  strokes: string[]
  medians: number[][][]
  radStrokes?: number[]
}

export interface Point {
  x: number
  y: number
}
