import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../store/settings'
import type { Entry } from '../types'
import { Badge } from './ui'
import { FavoriteButton } from './FavoriteButton'

function hskTone(hsk: number) {
  if (hsk === 0) return 'neutral' as const
  if (hsk <= 2) return 'sage' as const
  if (hsk <= 4) return 'butter' as const
  if (hsk <= 6) return 'lavender' as const
  return 'accent' as const
}

export function EntryRow({
  entry,
  onPractice,
}: {
  entry: Entry
  onPractice: (entry: Entry) => void
}) {
  const { t } = useTranslation()
  const language = useSettings((state) => state.language)
  const primary = language === 'vi' ? entry.vi[0] : entry.en[0]
  const fallback = language === 'vi' ? entry.en[0] : entry.vi[0]
  const meaning = primary ?? fallback
  const usedFallback = !primary && Boolean(fallback)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onPractice(entry)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onPractice(entry)
        }
      }}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-transparent px-2 py-2.5 text-left transition hover:border-line hover:bg-surface-2/60 active:scale-[0.995]"
    >
      <span className="hanzi grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft/70 text-2xl font-medium text-ink">
        {entry.simp}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="hanzi truncate text-base font-semibold text-ink">
            {entry.simp}
          </span>
          <span className="truncate text-[13px] font-medium text-accent">{entry.pinyin}</span>
        </span>
        <span className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-muted">
          {meaning ?? t('common.noDefinition')}
          {usedFallback ? (
            <span className="ml-1 text-[10px] font-bold uppercase text-muted/60">
              {language === 'vi' ? 'EN' : 'VI'}
            </span>
          ) : null}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge tone={hskTone(entry.hsk)}>
            {entry.hsk === 0 ? t('common.common') : `HSK ${entry.hsk}`}
          </Badge>
          {entry.strokes > 0 ? (
            <span className="text-[11px] font-medium text-muted">
              {entry.strokes} {t('common.strokes', { count: entry.strokes })}
            </span>
          ) : null}
        </span>
      </span>
      <FavoriteButton
        type={entry.type}
        text={entry.simp}
        pinyin={entry.pinyin}
        meaning={meaning}
        size="sm"
      />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted/50 transition group-hover:translate-x-0.5 group-hover:text-muted" />
    </div>
  )
}
