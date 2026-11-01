import { PenLine, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { pinyin } from 'pinyin-pro'
import { containsHan, isHan, type RankedEntry } from '../lib/search'
import type { Entry } from '../types'
import { Badge, Button, Card, EmptyState } from './ui'
import { EntryRow } from './EntryRow'
import { FavoriteButton } from './FavoriteButton'

export function SearchResults({
  results,
  query,
  onPractice,
  onPracticeSentence,
}: {
  results: RankedEntry[]
  query: string
  onPractice: (entry: Entry) => void
  onPracticeSentence: (text: string) => void
}) {
  const { t } = useTranslation()
  const [limit, setLimit] = useState(30)
  const trimmed = query.trim()
  const hanChars = [...trimmed].filter(isHan)
  const exactWord = results.some((entry) => entry.simp === trimmed && entry.type === 'word')
  const sentence =
    containsHan(trimmed) && hanChars.length > 1 && !exactWord ? trimmed : null

  return (
    <div className="space-y-3">
      {sentence ? (
        <Card className="overflow-hidden p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Badge tone="lavender">
              <Sparkles className="h-3 w-3" />
              {t('practice.sentence')}
            </Badge>
            <FavoriteButton
              type="sentence"
              text={sentence}
              pinyin={pinyin(sentence, { toneType: 'symbol' })}
              meaning={sentence}
              size="sm"
            />
          </div>
          <p className="hanzi text-2xl font-medium leading-relaxed text-ink">{sentence}</p>
          <p className="mt-1 text-xs text-accent">
            {pinyin(sentence, { toneType: 'symbol' })}
          </p>
          <Button
            className="mt-3 w-full"
            variant="soft"
            onClick={() => onPracticeSentence(sentence)}
          >
            <PenLine className="h-4 w-4" />
            {t('search.sentence')}
          </Button>
        </Card>
      ) : null}

      {!sentence || results.length > 0 ? (
        <>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-ink">{t('search.results')}</h2>
            {results.length > 0 ? (
              <span className="text-xs font-medium text-muted">
                {t('search.resultsCount', { count: results.length })}
              </span>
            ) : null}
          </div>

          {results.length === 0 ? (
            <EmptyState
              title={t('search.empty')}
              description={t('search.emptyHint')}
              icon={<Sparkles className="h-6 w-6" />}
            />
          ) : (
            <Card className="divide-y divide-line/60 p-1.5">
              {results.slice(0, limit).map((entry) => (
                <EntryRow key={entry.id} entry={entry} onPractice={onPractice} />
              ))}
            </Card>
          )}

          {results.length > limit ? (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setLimit((value) => value + 30)}
            >
              {t('common.showMore')}
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
