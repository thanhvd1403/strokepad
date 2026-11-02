import Dexie, { type Table } from 'dexie'
import type { Favorite, FavoriteType } from '../types'

class AppDatabase extends Dexie {
  favorites!: Table<Favorite, number>

  constructor() {
    // Historical database name, kept so existing favorites survive the
    // Strokepad rename.
    super('hanzi-practice')
    this.version(1).stores({
      favorites: '++id, type, text, [type+text], createdAt',
    })
  }
}

export const db = new AppDatabase()

export async function getFavorite(type: FavoriteType, text: string) {
  return db.favorites.where('[type+text]').equals([type, text]).first()
}

export async function toggleFavorite(
  favorite: Omit<Favorite, 'id' | 'createdAt'>,
): Promise<boolean> {
  const existing = await getFavorite(favorite.type, favorite.text)
  if (existing?.id) {
    await db.favorites.delete(existing.id)
    return false
  }
  await db.favorites.add({ ...favorite, createdAt: Date.now() })
  return true
}

export async function removeFavorite(id: number) {
  await db.favorites.delete(id)
}

export async function exportFavorites() {
  const favorites = await db.favorites.toArray()
  const payload = {
    // Keep the historical app id so older exports still import cleanly.
    app: 'hanzi-practice',
    version: 1,
    exportedAt: new Date().toISOString(),
    favorites,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hanzi-favorites-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importFavorites(file: File) {
  const text = await file.text()
  const parsed = JSON.parse(text) as { favorites?: Favorite[] }
  if (!Array.isArray(parsed.favorites)) {
    throw new Error('Invalid favorites file')
  }
  const valid = parsed.favorites.filter(
    (f) =>
      f &&
      typeof f.text === 'string' &&
      (f.type === 'char' || f.type === 'word' || f.type === 'sentence'),
  )
  for (const favorite of valid) {
    const existing = await getFavorite(favorite.type, favorite.text)
    if (!existing) {
      await db.favorites.add({
        type: favorite.type,
        text: favorite.text,
        pinyin: favorite.pinyin,
        meaning: favorite.meaning,
        createdAt: favorite.createdAt || Date.now(),
      })
    }
  }
  return valid.length
}

export async function clearLocalData() {
  await db.favorites.clear()
  localStorage.removeItem('hanzi-settings')
  localStorage.removeItem('hanzi-language')
  localStorage.removeItem('hanzi-recent-searches')
}
