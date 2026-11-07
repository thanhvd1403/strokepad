import { clsx } from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  ChevronRight,
  Folder,
  PenLine,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CollectionNameSheet } from '../components/CollectionNameSheet'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Segmented,
  Sheet,
} from '../components/ui'
import { loadEntries } from '../lib/data'
import {
  collectionName,
  createCollection,
  db,
  deleteCollection,
  isFavoriteCollection,
  removeCollectionItem,
  renameCollection,
  sortCollections,
} from '../lib/db'
import { toScript } from '../lib/script'
import { useSettings } from '../store/settings'
import type { Collection, CollectionItem, Entry, FavoriteType } from '../types'

type Tab = 'all' | FavoriteType

const typeTone: Record<FavoriteType, 'accent' | 'sage' | 'lavender'> = {
  char: 'sage',
  word: 'accent',
  sentence: 'lavender',
}

function CollectionItemRow({
  item,
  displayText,
  onPractice,
}: {
  item: CollectionItem
  displayText: string
  onPractice: (item: CollectionItem) => void
}) {
  const { t } = useTranslation()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onPractice(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onPractice(item)
        }
      }}
      className="group flex cursor-pointer items-center gap-3 px-3 py-3 transition hover:bg-surface-2/60"
    >
      <div className="hanzi grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-xl font-medium text-ink">
        {displayText.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="hanzi truncate text-sm font-semibold text-ink">
            {displayText}
          </p>
          {item.pinyin ? (
            <p className="truncate text-[13px] font-medium text-accent">
              {item.pinyin}
            </p>
          ) : null}
        </div>
        {item.meaning && item.meaning !== item.text ? (
          <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">
            {item.meaning}
          </p>
        ) : null}
        <div className="mt-1">
          <Badge tone={typeTone[item.type]}>
            {item.type === 'char'
              ? t('collections.chars')
              : item.type === 'word'
                ? t('collections.words')
                : t('collections.sentences')}
          </Badge>
        </div>
      </div>
      <button
        type="button"
        aria-label={t('collections.remove')}
        onClick={async (event) => {
          event.preventDefault()
          event.stopPropagation()
          if (item.id) await removeCollectionItem(item.id)
        }}
        className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-danger-soft hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted/50 transition group-hover:translate-x-0.5 group-hover:text-muted" />
    </div>
  )
}

export function Collections() {
  const { t } = useTranslation()
  const [creating, setCreating] = useState(false)
  const collections = useLiveQuery(async () => {
    const [list, items] = await Promise.all([
      db.collections.toArray(),
      db.collectionItems.toArray(),
    ])
    const counts = new Map<number, number>()
    for (const item of items) {
      counts.set(item.collectionId, (counts.get(item.collectionId) ?? 0) + 1)
    }
    return sortCollections(list).map((collection) => ({
      ...collection,
      count: counts.get(collection.id!) ?? 0,
    }))
  }, [])

  return (
    <div className="animate-fade-up space-y-4">
      <header className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
            {t('nav.collections')}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            {t('collections.title')}
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            {t('collections.count', { count: collections?.length ?? 0 })}
          </p>
        </div>
        <Button size="sm" variant="soft" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          {t('collections.new')}
        </Button>
      </header>

      {collections === undefined ? (
        <Card className="space-y-3 p-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="h-11 w-11 animate-pulse-soft rounded-2xl bg-surface-2" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/2 animate-pulse-soft rounded-full bg-surface-2" />
                <div className="h-2.5 w-2/3 animate-pulse-soft rounded-full bg-surface-2" />
              </div>
            </div>
          ))}
        </Card>
      ) : collections.length === 0 ? (
        <EmptyState
          title={t('collections.empty')}
          description={t('collections.hint')}
          icon={<Folder className="h-6 w-6" />}
          action={
            <Button variant="soft" onClick={() => setCreating(true)}>
              {t('collections.new')}
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-line/60 p-1">
          {collections.map((collection) => {
            const favorite = isFavoriteCollection(collection)
            return (
              <Link
                key={collection.id}
                to={`/collections/${collection.id}`}
                className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-surface-2/60"
              >
                <div
                  className={clsx(
                    'grid h-11 w-11 shrink-0 place-items-center rounded-2xl',
                    favorite
                      ? 'bg-butter-soft text-butter'
                      : 'bg-accent-soft/70 text-accent',
                  )}
                >
                  {favorite ? (
                    <Star className="h-5 w-5 fill-current" />
                  ) : (
                    <Folder className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {collectionName(collection, t('collections.favorite'))}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {t('collections.itemsCount', { count: collection.count })}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted/50 transition group-hover:translate-x-0.5 group-hover:text-muted" />
              </Link>
            )
          })}
        </Card>
      )}

      {creating ? (
        <CollectionNameSheet
          title={t('collections.new')}
          description={t('collections.newHint')}
          submitLabel={t('collections.create')}
          onClose={() => setCreating(false)}
          onSubmit={async (name) => {
            await createCollection(name)
            setCreating(false)
          }}
        />
      ) : null}
    </div>
  )
}

export function CollectionDetail() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const script = useSettings((state) => state.script)
  const collectionId = Number(id)
  const [entries, setEntries] = useState<Entry[]>([])
  const [tab, setTab] = useState<Tab>('all')
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const collection = useLiveQuery(async (): Promise<Collection | null> => {
    if (!Number.isFinite(collectionId)) return null
    return (await db.collections.get(collectionId)) ?? null
  }, [collectionId])

  const items = useLiveQuery(async () => {
    if (!Number.isFinite(collectionId)) return []
    return db.collectionItems
      .where('collectionId')
      .equals(collectionId)
      .toArray()
  }, [collectionId])

  useEffect(() => {
    loadEntries()
      .then((data) => setEntries(data.entries))
      .catch(() => setEntries([]))
  }, [])

  const sorted = useMemo(
    () => [...(items ?? [])].sort((a, b) => b.createdAt - a.createdAt),
    [items],
  )

  const filtered = useMemo(
    () => (tab === 'all' ? sorted : sorted.filter((item) => item.type === tab)),
    [sorted, tab],
  )

  const displayText = (text: string) => toScript(text, script, entries)

  const practice = (item: CollectionItem) => {
    navigate(`/practice?text=${encodeURIComponent(displayText(item.text))}&i=0`)
  }

  const practiceAll = () => {
    const text = filtered
      .slice(0, 20)
      .map((item) => displayText(item.text))
      .join('')
    if (text) navigate(`/practice?text=${encodeURIComponent(text)}&i=0`)
  }

  if (collection === null) {
    return (
      <div className="animate-fade-up space-y-4">
        <IconButton
          label={t('common.back')}
          onClick={() => navigate('/collections')}
        >
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
        <EmptyState
          title={t('collections.notFound')}
          description={t('collections.notFoundHint')}
          icon={<Folder className="h-6 w-6" />}
          action={
            <Button variant="soft" onClick={() => navigate('/collections')}>
              {t('nav.collections')}
            </Button>
          }
        />
      </div>
    )
  }

  const favorite = collection ? isFavoriteCollection(collection) : false
  const name = collection
    ? collectionName(collection, t('collections.favorite'))
    : '…'

  const handleDelete = async () => {
    await deleteCollection(collectionId)
    setDeleting(false)
    navigate('/collections', { replace: true })
  }

  return (
    <div className="animate-fade-up space-y-4">
      <header className="flex items-start gap-1.5">
        <IconButton
          label={t('common.back')}
          onClick={() => navigate('/collections')}
        >
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
        <div className="min-w-0 flex-1 pt-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            {t('nav.collections')}
          </p>
          <h1 className="mt-0.5 truncate text-xl font-bold leading-tight text-ink">
            {name}
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            {t('collections.itemsCount', { count: items?.length ?? 0 })}
          </p>
        </div>
        {favorite ? null : (
          <>
            <IconButton
              label={t('collections.rename')}
              onClick={() => setRenaming(true)}
            >
              <Pencil className="h-5 w-5" />
            </IconButton>
            <IconButton
              label={t('collections.delete')}
              onClick={() => setDeleting(true)}
              className="hover:text-danger"
            >
              <Trash2 className="h-5 w-5" />
            </IconButton>
          </>
        )}
      </header>

      <Segmented
        className="w-full"
        value={tab}
        onChange={(value: Tab) => setTab(value)}
        options={[
          { value: 'all', label: t('collections.all') },
          { value: 'char', label: t('collections.chars') },
          { value: 'word', label: t('collections.words') },
          { value: 'sentence', label: t('collections.sentences') },
        ]}
      />

      {filtered.length > 0 ? (
        <Button size="sm" variant="soft" onClick={practiceAll}>
          <PenLine className="h-4 w-4" />
          {t('collections.practiceAll')}
        </Button>
      ) : null}

      {items === undefined ? (
        <Card className="space-y-3 p-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="h-11 w-11 animate-pulse-soft rounded-2xl bg-surface-2" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/2 animate-pulse-soft rounded-full bg-surface-2" />
                <div className="h-2.5 w-2/3 animate-pulse-soft rounded-full bg-surface-2" />
              </div>
            </div>
          ))}
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t('collections.empty')}
          description={t('collections.emptyHint')}
          icon={favorite ? <Star className="h-6 w-6" /> : <Folder className="h-6 w-6" />}
          action={
            <Button variant="soft" onClick={() => navigate('/')}>
              {t('nav.search')}
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-line/60 p-1">
          {filtered.map((item) => (
            <CollectionItemRow
              key={item.id}
              item={item}
              displayText={displayText(item.text)}
              onPractice={practice}
            />
          ))}
        </Card>
      )}

      {renaming && collection ? (
        <CollectionNameSheet
          title={t('collections.rename')}
          description={t('collections.renameHint')}
          initialName={collection.name}
          submitLabel={t('common.save')}
          excludeId={collectionId}
          onClose={() => setRenaming(false)}
          onSubmit={async (value) => {
            await renameCollection(collectionId, value)
            setRenaming(false)
          }}
        />
      ) : null}

      {deleting && collection ? (
        <Sheet
          open
          onClose={() => setDeleting(false)}
          title={t('collections.delete')}
        >
          <div className="space-y-4">
            <div className="flex flex-col items-center px-2 py-2 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-danger-soft text-danger">
                <Trash2 className="h-6 w-6" />
              </div>
              <p className="mt-3 text-base font-semibold text-ink">
                {t('collections.deleteTitle')}
              </p>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">
                {t('collections.deleteNamed', { name })}
              </p>
              <p className="mt-2 text-xs font-semibold text-danger">
                {t('collections.deleteItems', { count: items?.length ?? 0 })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setDeleting(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => void handleDelete()}
              >
                <Trash2 className="h-4 w-4" />
                {t('collections.deleteAction')}
              </Button>
            </div>
          </div>
        </Sheet>
      ) : null}
    </div>
  )
}
