export type EntryType = 'char' | 'word'

export interface Entry {
  id: string
  type: EntryType
  simp: string
  trad: string
  pinyin: string
  pinyinFlat: string
  pinyinNumbered: string
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

export interface Collection {
  id?: number
  name: string
  createdAt: number
}

export interface CollectionItem {
  id?: number
  collectionId: number
  type: FavoriteType
  text: string
  pinyin?: string
  meaning?: string
  createdAt: number
}

export type GhostMode = 'full' | 'next' | 'off'
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
