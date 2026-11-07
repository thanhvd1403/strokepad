import { clsx } from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Folder, FolderPlus, Plus, Star } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FAVORITE_COLLECTION_ID,
  addToCollection,
  collectionName,
  createCollection,
  db,
  getItemCollectionIds,
  isFavoriteCollection,
  sortCollections,
  toggleCollectionItem,
} from '../lib/db'
import type { FavoriteType } from '../types'
import { Button, Sheet } from './ui'

export function CollectionButton({
  type,
  text,
  pinyin,
  meaning,
  size = 'md',
  className,
}: {
  type: FavoriteType
  text: string
  pinyin?: string
  meaning?: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const data = useLiveQuery(async () => {
    const [collections, ids] = await Promise.all([
      db.collections.toArray(),
      getItemCollectionIds(type, text),
    ])
    return {
      collections: sortCollections(collections),
      ids: new Set(ids),
    }
  }, [type, text])

  const collections = data?.collections ?? []
  const memberIds = data?.ids ?? new Set<number>()
  const inCustomCollection = [...memberIds].some(
    (id) => id !== FAVORITE_COLLECTION_ID,
  )

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setOpen(true)
  }

  const stopKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  const close = () => {
    setOpen(false)
    setCreating(false)
    setName('')
    setError(null)
  }

  const favoriteLabel = t('collections.favorite').trim().toLocaleLowerCase()
  const nameTaken = (value: string) => {
    const normalized = value.trim().toLocaleLowerCase()
    return collections.some((collection) => {
      if (collection.name.trim().toLocaleLowerCase() === normalized) return true
      return (
        isFavoriteCollection(collection) && favoriteLabel === normalized
      )
    })
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t('collections.nameRequired'))
      return
    }
    if (nameTaken(trimmed)) {
      setError(t('collections.nameTaken'))
      return
    }
    try {
      const id = await createCollection(trimmed)
      await addToCollection(id, { type, text, pinyin, meaning })
      setName('')
      setCreating(false)
      setError(null)
    } catch {
      setError(t('errors.generic'))
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={t('common.addToCollection')}
        title={t('common.addToCollection')}
        aria-pressed={inCustomCollection}
        onClick={handleClick}
        onKeyDown={stopKey}
        className={clsx(
          'grid shrink-0 place-items-center rounded-full transition active:scale-90',
          inCustomCollection
            ? 'text-accent'
            : 'text-muted hover:text-accent',
          size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
          className,
        )}
      >
        <FolderPlus
          className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'}
          strokeWidth={inCustomCollection ? 2.2 : 1.9}
        />
      </button>

      <Sheet open={open} onClose={close} title={t('collections.addTo')}>
        <p className="mb-3 text-xs leading-relaxed text-muted">
          {t('collections.addHint')}
        </p>

        <div className="space-y-1">
          {collections.map((collection) => {
            const checked = memberIds.has(collection.id!)
            const favorite = isFavoriteCollection(collection)
            return (
              <button
                key={collection.id}
                type="button"
                onClick={() => {
                  void toggleCollectionItem(collection.id!, {
                    type,
                    text,
                    pinyin,
                    meaning,
                  })
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-surface-2"
              >
                <span
                  className={clsx(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
                    favorite
                      ? 'bg-butter-soft text-butter'
                      : 'bg-accent-soft/70 text-accent',
                  )}
                >
                  {favorite ? (
                    <Star className="h-4 w-4" />
                  ) : (
                    <Folder className="h-4 w-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                  {collectionName(collection, t('collections.favorite'))}
                </span>
                <span
                  className={clsx(
                    'grid h-5 w-5 shrink-0 place-items-center rounded-full border transition',
                    checked
                      ? 'border-accent bg-accent text-white dark:text-[#1e1e2e]'
                      : 'border-line text-transparent',
                  )}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              </button>
            )
          })}
        </div>

        {creating ? (
          <form onSubmit={handleCreate} className="mt-3 space-y-2">
            <input
              autoFocus
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              placeholder={t('collections.namePlaceholder')}
              aria-label={t('collections.nameLabel')}
              maxLength={40}
              className="h-11 w-full rounded-2xl border border-line bg-surface-2 px-3 text-sm font-medium text-ink outline-none transition placeholder:text-muted/70 focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
            />
            {error ? <p className="text-xs text-danger">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="flex-1">
                {t('collections.create')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCreating(false)
                  setName('')
                  setError(null)
                }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={() => setCreating(true)}
          >
            <Plus className="h-4 w-4" />
            {t('collections.new')}
          </Button>
        )}
      </Sheet>
    </>
  )
}
