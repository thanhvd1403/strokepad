import Dexie, { type Table } from 'dexie'
import type {
  Collection,
  CollectionItem,
  FavoriteType,
} from '../types'
import { PINYIN_CACHE } from './offline'
import { resetPinyinSuggestions } from './pinyin-suggest'

/** The Favorite collection is always present and cannot be renamed or removed. */
export const FAVORITE_COLLECTION_ID = 1
export const FAVORITE_COLLECTION_NAME = 'Favorite'

type ItemInput = Omit<CollectionItem, 'id' | 'collectionId' | 'createdAt'>

class AppDatabase extends Dexie {
  collections!: Table<Collection, number>
  collectionItems!: Table<CollectionItem, number>

  constructor() {
    // Historical database name, kept so existing collections survive the
    // Strokepad rename.
    super('hanzi-practice')

    this.version(1).stores({
      favorites: '++id, type, text, [type+text], createdAt',
    })

    // Favorites become the built-in "Favorite" collection. Existing rows are
    // copied into collectionItems so a word can live in several collections.
    this.version(2)
      .stores({
        collections: '++id, name, createdAt',
        collectionItems:
          '++id, collectionId, type, text, [type+text], [collectionId+type+text], createdAt',
        favorites: null,
      })
      .upgrade(async (transaction) => {
        const favorites = await transaction.table('favorites').toArray()
        await transaction.table('collections').add({
          id: FAVORITE_COLLECTION_ID,
          name: FAVORITE_COLLECTION_NAME,
          createdAt: Date.now(),
        })
        if (favorites.length > 0) {
          await transaction.table('collectionItems').bulkAdd(
            favorites.map((favorite) => ({
              collectionId: FAVORITE_COLLECTION_ID,
              type: favorite.type,
              text: favorite.text,
              pinyin: favorite.pinyin,
              meaning: favorite.meaning,
              createdAt: favorite.createdAt ?? Date.now(),
            })),
          )
        }
      })

    // Fresh installs skip the upgrade path, so seed the built-in collection.
    this.on('populate', (transaction) => {
      void transaction.table('collections').add({
        id: FAVORITE_COLLECTION_ID,
        name: FAVORITE_COLLECTION_NAME,
        createdAt: Date.now(),
      })
    })
  }
}

export const db = new AppDatabase()

export function isFavoriteCollection(collection: Pick<Collection, 'id'>) {
  return collection.id === FAVORITE_COLLECTION_ID
}

/** Favorite first, then custom collections in creation order. */
export function sortCollections<T extends Collection>(collections: T[]): T[] {
  return [...collections].sort((a, b) => {
    const aFavorite = isFavoriteCollection(a)
    const bFavorite = isFavoriteCollection(b)
    if (aFavorite !== bFavorite) return aFavorite ? -1 : 1
    return a.createdAt - b.createdAt
  })
}

export function collectionName(
  collection: Collection,
  favoriteLabel: string,
) {
  return isFavoriteCollection(collection) ? favoriteLabel : collection.name
}

export async function getCollectionItem(
  collectionId: number,
  type: FavoriteType,
  text: string,
) {
  return db.collectionItems
    .where('[collectionId+type+text]')
    .equals([collectionId, type, text])
    .first()
}

/** All collections that currently contain this character, word, or sentence. */
export async function getItemCollectionIds(type: FavoriteType, text: string) {
  const items = await db.collectionItems
    .where('[type+text]')
    .equals([type, text])
    .toArray()
  return [...new Set(items.map((item) => item.collectionId))]
}

export async function addToCollection(
  collectionId: number,
  item: ItemInput,
): Promise<boolean> {
  const existing = await getCollectionItem(collectionId, item.type, item.text)
  if (existing) return false
  await db.collectionItems.add({
    ...item,
    collectionId,
    createdAt: Date.now(),
  })
  return true
}

export async function toggleCollectionItem(
  collectionId: number,
  item: ItemInput,
): Promise<boolean> {
  const existing = await getCollectionItem(collectionId, item.type, item.text)
  if (existing?.id) {
    await db.collectionItems.delete(existing.id)
    return false
  }
  await db.collectionItems.add({
    ...item,
    collectionId,
    createdAt: Date.now(),
  })
  return true
}

export async function removeCollectionItem(id: number) {
  await db.collectionItems.delete(id)
}

export async function createCollection(name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Collection name is required')
  return db.collections.add({ name: trimmed, createdAt: Date.now() })
}

export async function renameCollection(id: number, name: string) {
  if (id === FAVORITE_COLLECTION_ID) {
    throw new Error('The Favorite collection cannot be renamed')
  }
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Collection name is required')
  await db.collections.update(id, { name: trimmed })
}

export async function deleteCollection(id: number) {
  if (id === FAVORITE_COLLECTION_ID) {
    throw new Error('The Favorite collection cannot be deleted')
  }
  await db.transaction(
    'rw',
    db.collections,
    db.collectionItems,
    async () => {
      await db.collectionItems.where('collectionId').equals(id).delete()
      await db.collections.delete(id)
    },
  )
}

interface LegacyFavorite {
  type: FavoriteType
  text: string
  pinyin?: string
  meaning?: string
  createdAt?: number
}

interface ImportPayload {
  collections?: Collection[]
  items?: CollectionItem[]
  favorites?: LegacyFavorite[]
}

export async function exportCollections() {
  const [collections, items] = await Promise.all([
    db.collections.toArray(),
    db.collectionItems.toArray(),
  ])
  const payload = {
    // Keep the historical app id so older exports still import cleanly.
    app: 'hanzi-practice',
    version: 2,
    exportedAt: new Date().toISOString(),
    collections,
    items,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `strokepad-collections-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importCollections(file: File) {
  const parsed = JSON.parse(await file.text()) as ImportPayload
  const importedCollections = Array.isArray(parsed.collections)
    ? parsed.collections
    : []
  const importedItems = Array.isArray(parsed.items) ? parsed.items : []
  const legacyFavorites = Array.isArray(parsed.favorites)
    ? parsed.favorites
    : []

  if (
    !Array.isArray(parsed.collections) &&
    !Array.isArray(parsed.items) &&
    !Array.isArray(parsed.favorites)
  ) {
    throw new Error('Invalid collections file')
  }

  const existing = await db.collections.toArray()
  const byName = new Map(
    existing.map((collection) => [
      collection.name.trim().toLocaleLowerCase(),
      collection.id!,
    ]),
  )
  const importedIds = new Map<number, number>()
  let imported = 0

  const resolveCollection = async (collection: Collection) => {
    const name = typeof collection.name === 'string' ? collection.name : ''
    const favoriteName =
      name.trim().toLocaleLowerCase() ===
      FAVORITE_COLLECTION_NAME.toLocaleLowerCase()
    if (isFavoriteCollection(collection) || favoriteName) {
      return FAVORITE_COLLECTION_ID
    }
    const key = name.trim().toLocaleLowerCase()
    if (!key) return FAVORITE_COLLECTION_ID
    const found = byName.get(key)
    if (found) return found
    const id = await createCollection(name)
    byName.set(key, id)
    return id
  }

  for (const collection of importedCollections) {
    if (!collection || typeof collection.name !== 'string') continue
    const localId = await resolveCollection(collection)
    if (typeof collection.id === 'number') {
      importedIds.set(collection.id, localId)
    }
  }

  const add = async (
    collectionId: number,
    item: LegacyFavorite | CollectionItem,
  ) => {
    if (
      !item ||
      typeof item.text !== 'string' ||
      (item.type !== 'char' && item.type !== 'word' && item.type !== 'sentence')
    ) {
      return
    }
    const added = await addToCollection(collectionId, {
      type: item.type,
      text: item.text,
      pinyin: item.pinyin,
      meaning: item.meaning,
    })
    if (added) imported++
  }

  for (const favorite of legacyFavorites) {
    await add(FAVORITE_COLLECTION_ID, favorite)
  }

  for (const item of importedItems) {
    if (!item) continue
    const localId =
      typeof item.collectionId === 'number'
        ? importedIds.get(item.collectionId) ?? FAVORITE_COLLECTION_ID
        : FAVORITE_COLLECTION_ID
    await add(localId, item)
  }

  return imported
}

export async function clearLocalData() {
  await db.transaction(
    'rw',
    db.collections,
    db.collectionItems,
    async () => {
      await db.collectionItems.clear()
      await db.collections.clear()
      await db.collections.add({
        id: FAVORITE_COLLECTION_ID,
        name: FAVORITE_COLLECTION_NAME,
        createdAt: Date.now(),
      })
    },
  )
  localStorage.removeItem('hanzi-settings')
  localStorage.removeItem('hanzi-language')
  localStorage.removeItem('hanzi-recent-searches')
  if (typeof caches !== 'undefined') {
    await caches.delete(PINYIN_CACHE)
  }
  resetPinyinSuggestions()
}
