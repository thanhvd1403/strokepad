import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, PenLine, Star, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Segmented } from '../components/ui'
import { loadEntries } from '../lib/data'
import { db, removeFavorite } from '../lib/db'
import { toScript } from '../lib/script'
import { useSettings } from '../store/settings'
import type { Entry, Favorite, FavoriteType } from '../types'

type Tab = 'all' | FavoriteType

const typeTone: Record<FavoriteType, 'accent' | 'sage' | 'lavender'> = {
  char: 'sage',
  word: 'accent',
  sentence: 'lavender',
}

function FavoriteRow({
  favorite,
  displayText,
  onPractice,
}: {
  favorite: Favorite
  displayText: string
  onPractice: (favorite: Favorite) => void
}) {
  const { t } = useTranslation()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onPractice(favorite)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onPractice(favorite)
        }
      }}
      className="group flex cursor-pointer items-center gap-3 px-3 py-3 transition hover:bg-surface-2/60"
    >
      <div className="hanzi grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-xl font-medium text-ink">
        {displayText.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="hanzi truncate text-sm font-semibold text-ink">{displayText}</p>
          {favorite.pinyin ? (
            <p className="truncate text-[13px] font-medium text-accent">{favorite.pinyin}</p>
          ) : null}
        </div>
        {favorite.meaning ? (
          <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{favorite.meaning}</p>
        ) : null}
        <div className="mt-1">
          <Badge tone={typeTone[favorite.type]}>
            {favorite.type === 'char'
              ? t('favorites.chars')
              : favorite.type === 'word'
                ? t('favorites.words')
                : t('favorites.sentences')}
          </Badge>
        </div>
      </div>
      <button
        type="button"
        aria-label={t('favorites.remove')}
        onClick={async (event) => {
          event.preventDefault()
          event.stopPropagation()
          if (favorite.id) await removeFavorite(favorite.id)
        }}
        className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-danger-soft hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted/50 transition group-hover:translate-x-0.5 group-hover:text-muted" />
    </div>
  )
}

export function Favorites() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const script = useSettings((state) => state.script)
  const [entries, setEntries] = useState<Entry[]>([])
  const [tab, setTab] = useState<Tab>('all')
  const favorites = useLiveQuery(() => db.favorites.orderBy('createdAt').reverse().toArray(), [])

  useEffect(() => {
    loadEntries()
      .then((data) => setEntries(data.entries))
      .catch(() => setEntries([]))
  }, [])

  const filtered = useMemo(() => {
    if (!favorites) return []
    return tab === 'all' ? favorites : favorites.filter((item) => item.type === tab)
  }, [favorites, tab])

  const displayText = (text: string) => toScript(text, script, entries)

  const practice = (favorite: Favorite) => {
    navigate(`/practice?text=${encodeURIComponent(displayText(favorite.text))}&i=0`)
  }

  const practiceAll = () => {
    const text = filtered
      .slice(0, 20)
      .map((favorite) => displayText(favorite.text))
      .join('')
    if (text) navigate(`/practice?text=${encodeURIComponent(text)}&i=0`)
  }

  return (
    <div className="animate-fade-up space-y-4">
      <header className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
            {t('nav.favorites')}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            {t('favorites.title')}
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            {favorites?.length ?? 0} {t('search.results').toLowerCase()}
          </p>
        </div>
        {filtered.length > 0 ? (
          <Button size="sm" variant="soft" onClick={practiceAll}>
            <PenLine className="h-4 w-4" />
            {t('favorites.practiceAll')}
          </Button>
        ) : null}
      </header>

      <Segmented
        className="w-full"
        value={tab}
        onChange={(value: Tab) => setTab(value)}
        options={[
          { value: 'all', label: t('favorites.all') },
          { value: 'char', label: t('favorites.chars') },
          { value: 'word', label: t('favorites.words') },
          { value: 'sentence', label: t('favorites.sentences') },
        ]}
      />

      {favorites === undefined ? (
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
          title={t('favorites.empty')}
          description={t('favorites.emptyHint')}
          icon={<Star className="h-6 w-6" />}
          action={
            <Button variant="soft" onClick={() => navigate('/')}>
              {t('nav.search')}
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-line/60 p-1">
          {filtered.map((favorite) => (
            <FavoriteRow
              key={favorite.id}
              favorite={favorite}
              displayText={displayText(favorite.text)}
              onPractice={practice}
            />
          ))}
        </Card>
      )}
    </div>
  )
}
